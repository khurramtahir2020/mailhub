import type { FastifyInstance } from 'fastify'
import { eq, and, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { messages, messageEvents, usageDaily } from '../db/schema.js'
import { confirmSubscription } from '../services/sns.js'
import { addSuppression } from '../services/suppressions.js'
import { updateContactStats, suppressContact } from '../services/contacts.js'

export async function webhookSesRoutes(app: FastifyInstance) {
  // Register text/plain content type parser (SNS sends text/plain)
  app.addContentTypeParser('text/plain', { parseAs: 'string' }, (req, body, done) => {
    try {
      done(null, JSON.parse(body as string))
    } catch (err) {
      done(err as Error, undefined)
    }
  })

  // POST /api/v1/webhooks/ses — SNS webhook (no auth)
  app.post('/api/v1/webhooks/ses', async (request, reply) => {
    const message = request.body as any

    request.log.info({ type: message.Type, topicArn: message.TopicArn }, 'SNS message received')

    // Handle subscription confirmation — skip signature verification for this
    if (message.Type === 'SubscriptionConfirmation') {
      request.log.info({ subscribeURL: message.SubscribeURL }, 'Confirming SNS subscription')
      try {
        await confirmSubscription(message.SubscribeURL)
        request.log.info('SNS subscription confirmed')
      } catch (err) {
        request.log.error({ err }, 'Failed to confirm SNS subscription')
      }
      return reply.status(200).send({ ok: true })
    }

    // Handle notification
    if (message.Type === 'Notification') {
      let sesEvent: any
      try {
        sesEvent = JSON.parse(message.Message)
      } catch {
        request.log.warn('Failed to parse SNS notification Message')
        return reply.status(200).send({ ok: true })
      }

      const eventType = sesEvent.eventType
      const sesMessageId = sesEvent.mail?.messageId
      const tags = sesEvent.mail?.tags ?? {}
      const tenantId = tags.tenant_id?.[0]
      const messageId = tags.message_id?.[0]

      request.log.info({ eventType, sesMessageId }, 'Processing SES event')

      if (!sesMessageId) {
        request.log.warn('SNS event missing mail.messageId')
        return reply.status(200).send({ ok: true })
      }

      // Look up message by sesMessageId
      const [msg] = await db
        .select()
        .from(messages)
        .where(eq(messages.sesMessageId, sesMessageId))
        .limit(1)

      if (!msg) {
        request.log.warn({ sesMessageId }, 'Orphaned SES event — message not found')
        return reply.status(200).send({ ok: true })
      }

      const resolvedTenantId = tenantId || msg.tenantId
      const resolvedMessageId = messageId || msg.id

      // Map SES event types to our status values
      const eventTypeMap: Record<string, string> = {
        Bounce: 'bounced',
        Delivery: 'delivered',
        Complaint: 'complained',
        Send: 'sent',
        Reject: 'rejected',
      }

      const mappedStatus = eventTypeMap[eventType] || eventType.toLowerCase()

      // Idempotency: check if event already exists
      const existingEvent = await db.query.messageEvents.findFirst({
        where: and(
          eq(messageEvents.messageId, resolvedMessageId),
          eq(messageEvents.eventType, eventType),
        ),
      })

      if (existingEvent) {
        return reply.status(200).send({ ok: true })
      }

      // Insert message event
      await db.insert(messageEvents).values({
        messageId: resolvedMessageId,
        tenantId: resolvedTenantId,
        eventType,
        rawEvent: sesEvent,
        bounceType: sesEvent.bounce?.bounceType,
        bounceSubtype: sesEvent.bounce?.bounceSubType,
      })

      // Update message status
      await db
        .update(messages)
        .set({ status: mappedStatus, updatedAt: new Date() })
        .where(eq(messages.id, resolvedMessageId))

      // Handle bounces, complaints, and deliveries
      if (eventType === 'Bounce') {
        if (sesEvent.bounce?.bounceType === 'Permanent') {
          await addSuppression({
            tenantId: resolvedTenantId,
            email: msg.toEmail,
            reason: 'hard_bounce',
            sourceMessageId: resolvedMessageId,
          })
          await suppressContact(msg.contactId, 'hard_bounce')
          await updateContactStats(msg.contactId, 'totalBounced')
        } else if (sesEvent.bounce?.bounceType === 'Transient') {
          await updateContactStats(msg.contactId, 'totalBounced')
        }
      } else if (eventType === 'Complaint') {
        await addSuppression({
          tenantId: resolvedTenantId,
          email: msg.toEmail,
          reason: 'complaint',
          sourceMessageId: resolvedMessageId,
        })
        await suppressContact(msg.contactId, 'complaint')
        await updateContactStats(msg.contactId, 'totalComplained')
      } else if (eventType === 'Delivery') {
        await updateContactStats(msg.contactId, 'totalDelivered')
      }

      // Update usage_daily for the event type
      const today = new Date().toISOString().slice(0, 10)
      const baseUpsert = () => db.insert(usageDaily).values({
        tenantId: resolvedTenantId,
        date: today,
      })

      if (eventType === 'Delivery') {
        await baseUpsert().onConflictDoUpdate({
          target: [usageDaily.tenantId, usageDaily.date],
          set: { emailsDelivered: sql`${usageDaily.emailsDelivered} + 1` },
        })
      } else if (eventType === 'Bounce') {
        await baseUpsert().onConflictDoUpdate({
          target: [usageDaily.tenantId, usageDaily.date],
          set: { emailsBounced: sql`${usageDaily.emailsBounced} + 1` },
        })
      } else if (eventType === 'Complaint') {
        await baseUpsert().onConflictDoUpdate({
          target: [usageDaily.tenantId, usageDaily.date],
          set: { emailsComplained: sql`${usageDaily.emailsComplained} + 1` },
        })
      } else if (eventType === 'Reject') {
        await baseUpsert().onConflictDoUpdate({
          target: [usageDaily.tenantId, usageDaily.date],
          set: { emailsRejected: sql`${usageDaily.emailsRejected} + 1` },
        })
      }
    }

    return reply.status(200).send({ ok: true })
  })
}
