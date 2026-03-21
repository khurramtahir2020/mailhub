import { eq, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { contacts } from '../db/schema.js'

export async function upsertContact(tenantId: string, email: string) {
  const [contact] = await db.insert(contacts).values({
    tenantId,
    email: email.toLowerCase(),
    firstSeenAt: new Date(),
  }).onConflictDoUpdate({
    target: [contacts.tenantId, contacts.email],
    set: {
      lastEmailedAt: new Date(),
      totalSent: sql`${contacts.totalSent} + 1`,
      updatedAt: new Date(),
    },
  }).returning()
  return contact
}

export async function updateContactStats(
  contactId: string,
  field: 'totalDelivered' | 'totalBounced' | 'totalComplained',
) {
  await db.update(contacts)
    .set({
      [field]: sql`${contacts[field]} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId))
}

export async function suppressContact(contactId: string, reason: string) {
  await db.update(contacts)
    .set({
      status: 'suppressed',
      suppressionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, contactId))
}
