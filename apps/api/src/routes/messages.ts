import type { FastifyInstance } from 'fastify'
import { eq, and, desc, asc, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { messages, messageEvents } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { Errors } from '../lib/errors.js'

export async function messageRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  // GET /api/v1/tenants/:tenantId/messages — List messages
  app.get<{
    Params: { tenantId: string }
    Querystring: { page?: string; limit?: string; status?: string; from?: string; to?: string; email?: string }
  }>('/api/v1/tenants/:tenantId/messages', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query)
    const tenantId = request.tenantId!
    const { status, from, to, email } = request.query

    const conditions = [eq(messages.tenantId, tenantId)]

    if (status) {
      conditions.push(eq(messages.status, status))
    }
    if (from) {
      conditions.push(gte(messages.createdAt, new Date(from)))
    }
    if (to) {
      conditions.push(lte(messages.createdAt, new Date(to)))
    }
    if (email) {
      conditions.push(eq(messages.toEmail, email.toLowerCase()))
    }

    const where = and(...conditions)

    const [data, [{ count }]] = await Promise.all([
      db.select()
        .from(messages)
        .where(where)
        .orderBy(desc(messages.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(where),
    ])

    return reply.send(paginatedResponse(data, count, page, limit))
  })

  // GET /api/v1/tenants/:tenantId/messages/:messageId — Message detail with events
  app.get<{
    Params: { tenantId: string; messageId: string }
  }>('/api/v1/tenants/:tenantId/messages/:messageId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const tenantId = request.tenantId!

    const message = await db.query.messages.findFirst({
      where: and(eq(messages.id, request.params.messageId), eq(messages.tenantId, tenantId)),
    })

    if (!message) throw Errors.notFound('Message')

    const events = await db.select()
      .from(messageEvents)
      .where(eq(messageEvents.messageId, message.id))
      .orderBy(asc(messageEvents.createdAt))

    return reply.send({ ...message, events })
  })
}
