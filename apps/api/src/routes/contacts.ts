import type { FastifyInstance } from 'fastify'
import { eq, and, desc, ilike, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { contacts, messages } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { Errors } from '../lib/errors.js'

export async function contactRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  // GET /api/v1/tenants/:tenantId/contacts — List contacts
  app.get<{
    Params: { tenantId: string }
    Querystring: { page?: string; limit?: string; status?: string; search?: string }
  }>('/api/v1/tenants/:tenantId/contacts', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query)
    const tenantId = request.tenantId!
    const { status, search } = request.query

    const conditions = [eq(contacts.tenantId, tenantId)]

    if (status) {
      conditions.push(eq(contacts.status, status))
    }
    if (search) {
      conditions.push(ilike(contacts.email, `%${search}%`))
    }

    const where = and(...conditions)

    const [data, [{ count }]] = await Promise.all([
      db.select()
        .from(contacts)
        .where(where)
        .orderBy(desc(sql`COALESCE(${contacts.lastEmailedAt}, ${contacts.createdAt})`))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)::int` })
        .from(contacts)
        .where(where),
    ])

    return reply.send(paginatedResponse(data, count, page, limit))
  })

  // GET /api/v1/tenants/:tenantId/contacts/:contactId — Contact detail
  app.get<{
    Params: { tenantId: string; contactId: string }
  }>('/api/v1/tenants/:tenantId/contacts/:contactId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, request.params.contactId), eq(contacts.tenantId, request.tenantId!)),
    })
    if (!contact) throw Errors.notFound('Contact')
    return reply.send(contact)
  })

  // GET /api/v1/tenants/:tenantId/contacts/:contactId/messages — Contact messages
  app.get<{
    Params: { tenantId: string; contactId: string }
    Querystring: { page?: string; limit?: string }
  }>('/api/v1/tenants/:tenantId/contacts/:contactId/messages', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query)
    const tenantId = request.tenantId!
    const contactId = request.params.contactId

    // Verify contact exists and belongs to tenant
    const contact = await db.query.contacts.findFirst({
      where: and(eq(contacts.id, contactId), eq(contacts.tenantId, tenantId)),
    })
    if (!contact) throw Errors.notFound('Contact')

    const where = and(eq(messages.tenantId, tenantId), eq(messages.contactId, contactId))

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
}
