import { eq, and, isNull, or } from 'drizzle-orm'
import { db } from '../db/client.js'
import { suppressions } from '../db/schema.js'

export async function isEmailSuppressed(tenantId: string, email: string): Promise<boolean> {
  const suppression = await db.query.suppressions.findFirst({
    where: or(
      and(eq(suppressions.tenantId, tenantId), eq(suppressions.email, email.toLowerCase())),
      and(isNull(suppressions.tenantId), eq(suppressions.email, email.toLowerCase())),
    ),
  })
  return !!suppression
}

export async function addSuppression(params: {
  tenantId: string | null
  email: string
  reason: string
  sourceMessageId?: string
}) {
  await db.insert(suppressions).values({
    tenantId: params.tenantId,
    email: params.email.toLowerCase(),
    reason: params.reason,
    sourceMessageId: params.sourceMessageId,
  }).onConflictDoNothing()
}
