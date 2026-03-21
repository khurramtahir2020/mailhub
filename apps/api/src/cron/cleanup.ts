import { lt, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { idempotencyKeys, messageEvents, messages, auditLogs } from '../db/schema.js'
import pino from 'pino'

const logger = pino({ name: 'cron:cleanup' })

export async function cleanup() {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Clean expired idempotency keys
    const expiredKeys = await db.delete(idempotencyKeys)
      .where(lt(idempotencyKeys.expiresAt, now))
      .returning({ id: idempotencyKeys.id })

    // Clean old message events (must delete before messages due to FK)
    const oldEvents = await db.delete(messageEvents)
      .where(lt(messageEvents.createdAt, thirtyDaysAgo))
      .returning({ id: messageEvents.id })

    // Null out suppression references to old messages before deleting them
    await db.execute(sql`UPDATE suppressions SET source_message_id = NULL WHERE source_message_id IN (SELECT id FROM messages WHERE created_at < ${thirtyDaysAgo})`)

    // Clean old messages
    const oldMessages = await db.delete(messages)
      .where(lt(messages.createdAt, thirtyDaysAgo))
      .returning({ id: messages.id })

    // Clean old audit logs
    const oldAuditLogs = await db.delete(auditLogs)
      .where(lt(auditLogs.createdAt, ninetyDaysAgo))
      .returning({ id: auditLogs.id })

    logger.info({
      expiredKeys: expiredKeys.length,
      oldEvents: oldEvents.length,
      oldMessages: oldMessages.length,
      oldAuditLogs: oldAuditLogs.length,
    }, 'Cleanup complete')
  } catch (err) {
    logger.error({ err }, 'Cleanup cron failed')
  }
}
