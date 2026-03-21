import { eq, and, gt } from 'drizzle-orm'
import { db } from '../db/client.js'
import { idempotencyKeys } from '../db/schema.js'

export async function checkIdempotencyKey(tenantId: string, key: string) {
  const existing = await db.query.idempotencyKeys.findFirst({
    where: and(
      eq(idempotencyKeys.tenantId, tenantId),
      eq(idempotencyKeys.key, key),
      gt(idempotencyKeys.expiresAt, new Date()),
    ),
  })
  return existing?.responseBody ?? null
}

export async function storeIdempotencyKey(params: {
  tenantId: string
  key: string
  messageId: string
  responseBody: any
}) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  await db.insert(idempotencyKeys).values({
    tenantId: params.tenantId,
    key: params.key,
    messageId: params.messageId,
    responseBody: params.responseBody,
    expiresAt,
  }).onConflictDoNothing()
}
