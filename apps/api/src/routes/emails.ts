import type { FastifyInstance } from 'fastify'
import { eq, and, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { db } from '../db/client.js'
import { messages, senderIdentities, domains, templates, templateVersions, tenants, usageDaily } from '../db/schema.js'
import { requireApiKey } from '../middleware/auth.js'
import { sendEmailSchema } from '@mailhub/shared'
import { sendEmail } from '../services/ses.js'
import { upsertContact } from '../services/contacts.js'
import { isEmailSuppressed } from '../services/suppressions.js'
import { renderTemplate } from '../services/templates.js'
import { checkIdempotencyKey, storeIdempotencyKey } from '../services/idempotency.js'
import { validateEmailContent } from '../services/content-checks.js'
import { config } from '../config.js'

function parseFromAddress(from: string): { email: string; name?: string } {
  const match = from.match(/^"?(.+?)"?\s*<(.+?)>$/)
  if (match) return { name: match[1].trim(), email: match[2].toLowerCase() }
  return { email: from.toLowerCase() }
}

export async function emailRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireApiKey)

  // POST /api/v1/emails/send
  app.post('/api/v1/emails/send', async (request, reply) => {
    const body = sendEmailSchema.parse(request.body)
    const tenantId = request.tenantId!

    // 1. Check daily send limit
    const today = new Date().toISOString().slice(0, 10)
    const [usageRow] = await db
      .select({ emailsSent: usageDaily.emailsSent })
      .from(usageDaily)
      .where(and(eq(usageDaily.tenantId, tenantId), eq(usageDaily.date, today)))

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (usageRow && tenant && usageRow.emailsSent >= tenant.dailySendLimit) {
      return reply.status(422).send({
        error: { code: 'LIMIT_REACHED', message: 'Daily send limit reached' },
      })
    }

    // 2. Check idempotency
    if (body.idempotency_key) {
      const cached = await checkIdempotencyKey(tenantId, body.idempotency_key)
      if (cached) {
        return reply.status(200).send(cached)
      }
    }

    // 3. Parse from address
    const parsed = parseFromAddress(body.from)

    // 4. Validate sender
    const sender = await db.query.senderIdentities.findFirst({
      where: and(
        eq(senderIdentities.tenantId, tenantId),
        eq(senderIdentities.email, parsed.email),
      ),
    })

    if (!sender) {
      return reply.status(422).send({
        error: { code: 'SENDER_NOT_VERIFIED', message: 'Sender not verified' },
      })
    }

    // Check domain is verified
    const domain = await db.query.domains.findFirst({
      where: eq(domains.id, sender.domainId),
    })

    if (!domain || domain.status !== 'verified') {
      return reply.status(422).send({
        error: { code: 'SENDER_NOT_VERIFIED', message: 'Sender not verified' },
      })
    }

    // Use sender name as fallback display name
    const displayName = parsed.name || sender.name

    // 5. Upsert contact
    const contact = await upsertContact(tenantId, body.to)

    // 6. Check suppression
    const suppressed = await isEmailSuppressed(tenantId, body.to)
    if (suppressed) {
      return reply.status(422).send({
        error: { code: 'RECIPIENT_SUPPRESSED', message: 'Recipient is suppressed' },
      })
    }

    // 7. Resolve subject/html/text (template or raw)
    let subject = body.subject ?? ''
    let html = body.html
    let text = body.text
    let templateId: string | undefined
    let templateVersion: number | undefined

    if (body.template) {
      const tmpl = await db.query.templates.findFirst({
        where: and(
          eq(templates.tenantId, tenantId),
          eq(templates.name, body.template),
        ),
      })

      if (!tmpl) {
        return reply.status(422).send({
          error: { code: 'TEMPLATE_NOT_FOUND', message: 'Template not found' },
        })
      }

      const versionNum = body.template_version ?? tmpl.currentVersion
      const version = await db.query.templateVersions.findFirst({
        where: and(
          eq(templateVersions.templateId, tmpl.id),
          eq(templateVersions.version, versionNum),
        ),
      })

      if (!version) {
        return reply.status(422).send({
          error: { code: 'TEMPLATE_VERSION_NOT_FOUND', message: 'Template version not found' },
        })
      }

      const rendered = renderTemplate(
        version.subject,
        version.htmlBody,
        version.textBody,
        body.variables ?? {},
      )

      subject = rendered.subject
      html = rendered.html
      text = rendered.text
      templateId = tmpl.id
      templateVersion = versionNum
    }

    // 7b. Content checks
    const contentWarning = validateEmailContent(subject, html, text)
    if (contentWarning) {
      request.log.warn(contentWarning, 'Content check warning')
    }

    // 8. Send via SES
    const messageId = randomUUID()
    const fromAddress = displayName ? `${displayName} <${parsed.email}>` : parsed.email

    let sesMessageId: string | undefined
    let status = 'sent'

    try {
      sesMessageId = await sendEmail({
        from: fromAddress,
        to: body.to,
        subject,
        html,
        text,
        configurationSet: config.SES_CONFIGURATION_SET,
        tags: [
          { Name: 'tenant_id', Value: tenantId },
          { Name: 'message_id', Value: messageId },
        ],
      })
    } catch (err) {
      status = 'rejected'
      request.log.error({ err }, 'SES sendEmail failed')

      // Store failed message
      await db.insert(messages).values({
        id: messageId,
        tenantId,
        contactId: contact.id,
        fromEmail: parsed.email,
        toEmail: body.to,
        subject,
        templateId,
        templateVersion,
        status: 'rejected',
        sesMessageId: undefined,
      })

      return reply.status(502).send({
        error: { code: 'SEND_FAILED', message: 'Failed to send email' },
      })
    }

    // 9. Store message record
    await db.insert(messages).values({
      id: messageId,
      tenantId,
      contactId: contact.id,
      fromEmail: parsed.email,
      toEmail: body.to,
      subject,
      templateId,
      templateVersion,
      status,
      sesMessageId,
    })

    // 10. Store idempotency key
    const responseBody = {
      id: messageId,
      status,
      ses_message_id: sesMessageId,
      contact_id: contact.id,
    }

    if (body.idempotency_key) {
      await storeIdempotencyKey({
        tenantId,
        key: body.idempotency_key,
        messageId,
        responseBody,
      })
    }

    // 11. Upsert usage_daily
    await db.insert(usageDaily).values({
      tenantId,
      date: today,
      emailsSent: 1,
    }).onConflictDoUpdate({
      target: [usageDaily.tenantId, usageDaily.date],
      set: {
        emailsSent: sql`${usageDaily.emailsSent} + 1`,
      },
    })

    return reply.status(201).send(responseBody)
  })
}
