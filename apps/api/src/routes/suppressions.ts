import type { FastifyInstance } from 'fastify'
import { eq, and, sql, desc } from 'drizzle-orm'
import { db } from '../db/client.js'
import { suppressions, contacts } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { addSuppression } from '../services/suppressions.js'
import { createSuppressionSchema } from '@mailhub/shared'
import { Errors } from '../lib/errors.js'

export async function suppressionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  // GET /api/v1/tenants/:tenantId/suppressions — List suppressions
  app.get<{
    Params: { tenantId: string }
    Querystring: { page?: string; limit?: string; reason?: string }
  }>('/api/v1/tenants/:tenantId/suppressions', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query)
    const tenantId = request.tenantId!
    const { reason } = request.query

    const conditions = [eq(suppressions.tenantId, tenantId)]

    if (reason) {
      conditions.push(eq(suppressions.reason, reason))
    }

    const where = and(...conditions)

    const [data, [{ count }]] = await Promise.all([
      db.select()
        .from(suppressions)
        .where(where)
        .orderBy(desc(suppressions.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(suppressions)
        .where(where),
    ])

    return reply.send(paginatedResponse(data, count, page, limit))
  })

  // POST /api/v1/tenants/:tenantId/suppressions — Add manual suppression
  app.post<{
    Params: { tenantId: string }
  }>('/api/v1/tenants/:tenantId/suppressions', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const body = createSuppressionSchema.parse(request.body)
    const tenantId = request.tenantId!

    await addSuppression({
      tenantId,
      email: body.email,
      reason: body.reason,
    })

    // Also suppress the contact if they exist
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.tenantId, tenantId), eq(contacts.email, body.email.toLowerCase())),
    })

    if (contact) {
      await db.update(contacts)
        .set({ status: 'suppressed', suppressionReason: body.reason, updatedAt: new Date() })
        .where(eq(contacts.id, contact.id))
    }

    return reply.status(201).send({ ok: true })
  })

  // DELETE /api/v1/tenants/:tenantId/suppressions/:suppressionId — Remove suppression
  app.delete<{
    Params: { tenantId: string; suppressionId: string }
  }>('/api/v1/tenants/:tenantId/suppressions/:suppressionId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const tenantId = request.tenantId!

    const suppression = await db.query.suppressions.findFirst({
      where: and(eq(suppressions.id, request.params.suppressionId), eq(suppressions.tenantId, tenantId)),
    })

    if (!suppression) throw Errors.notFound('Suppression')

    // Delete the suppression
    await db.delete(suppressions).where(eq(suppressions.id, suppression.id))

    // Re-activate the contact if they exist
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.tenantId, tenantId), eq(contacts.email, suppression.email)),
    })

    if (contact) {
      await db.update(contacts)
        .set({ status: 'active', suppressionReason: null, updatedAt: new Date() })
        .where(eq(contacts.id, contact.id))
    }

    return reply.status(204).send()
  })
}
