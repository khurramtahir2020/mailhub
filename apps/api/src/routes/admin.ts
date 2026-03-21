import type { FastifyInstance } from 'fastify'
import { eq, and, gte, sql, count } from 'drizzle-orm'
import { db } from '../db/client.js'
import { tenants, users, usageDaily, domains, contacts, messages } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requirePlatformAdmin } from '../middleware/admin.js'
import { parsePagination, paginatedResponse } from '../lib/pagination.js'
import { Errors } from '../lib/errors.js'

export async function adminRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)
  app.addHook('preHandler', requirePlatformAdmin)

  // GET /api/v1/admin/tenants — List all tenants with owner email
  app.get<{
    Querystring: { page?: string; limit?: string }
  }>('/api/v1/admin/tenants', async (request, reply) => {
    const { page, limit, offset } = parsePagination(request.query)

    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [totalResult] = await db.select({ count: count() }).from(tenants)
    const total = totalResult.count

    const rows = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
        mode: tenants.mode,
        dailySendLimit: tenants.dailySendLimit,
        suspendedAt: tenants.suspendedAt,
        suspensionReason: tenants.suspensionReason,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt,
        ownerEmail: users.email,
        ownerName: users.name,
        emailsSentThisMonth: sql<number>`COALESCE(SUM(${usageDaily.emailsSent}), 0)::int`,
      })
      .from(tenants)
      .leftJoin(users, eq(tenants.userId, users.id))
      .leftJoin(
        usageDaily,
        and(
          eq(usageDaily.tenantId, tenants.id),
          gte(usageDaily.date, monthStart),
        ),
      )
      .groupBy(tenants.id, users.email, users.name)
      .limit(limit)
      .offset(offset)

    return reply.send(paginatedResponse(rows, total, page, limit))
  })

  // GET /api/v1/admin/tenants/:tenantId — Tenant detail
  app.get<{
    Params: { tenantId: string }
  }>('/api/v1/admin/tenants/:tenantId', async (request, reply) => {
    const { tenantId } = request.params

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      throw Errors.notFound('Tenant')
    }

    const owner = await db.query.users.findFirst({
      where: eq(users.id, tenant.userId),
    })

    // Usage stats for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10)

    const [usageStats] = await db.select({
      emailsSent: sql<number>`COALESCE(SUM(${usageDaily.emailsSent}), 0)::int`,
      emailsDelivered: sql<number>`COALESCE(SUM(${usageDaily.emailsDelivered}), 0)::int`,
      emailsBounced: sql<number>`COALESCE(SUM(${usageDaily.emailsBounced}), 0)::int`,
      emailsComplained: sql<number>`COALESCE(SUM(${usageDaily.emailsComplained}), 0)::int`,
      emailsRejected: sql<number>`COALESCE(SUM(${usageDaily.emailsRejected}), 0)::int`,
    })
      .from(usageDaily)
      .where(and(
        eq(usageDaily.tenantId, tenantId),
        gte(usageDaily.date, thirtyDaysAgoStr),
      ))

    const [domainCount] = await db.select({ count: count() }).from(domains).where(eq(domains.tenantId, tenantId))
    const [contactCount] = await db.select({ count: count() }).from(contacts).where(eq(contacts.tenantId, tenantId))
    const [messageCount] = await db.select({ count: count() }).from(messages).where(eq(messages.tenantId, tenantId))

    return reply.send({
      ...tenant,
      owner: owner ? { id: owner.id, email: owner.email, name: owner.name } : null,
      usage30d: usageStats,
      counts: {
        domains: domainCount.count,
        contacts: contactCount.count,
        messages: messageCount.count,
      },
    })
  })

  // POST /api/v1/admin/tenants/:tenantId/suspend — Suspend tenant
  app.post<{
    Params: { tenantId: string }
    Body: { reason: string }
  }>('/api/v1/admin/tenants/:tenantId/suspend', async (request, reply) => {
    const { tenantId } = request.params
    const { reason } = request.body as { reason: string }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      throw Errors.validation('Suspension reason is required')
    }

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      throw Errors.notFound('Tenant')
    }

    const [updated] = await db.update(tenants).set({
      status: 'suspended',
      suspendedAt: new Date(),
      suspensionReason: reason.trim(),
      reviewedBy: request.userId!,
      updatedAt: new Date(),
    }).where(eq(tenants.id, tenantId)).returning()

    return reply.send(updated)
  })

  // POST /api/v1/admin/tenants/:tenantId/unsuspend — Unsuspend tenant
  app.post<{
    Params: { tenantId: string }
  }>('/api/v1/admin/tenants/:tenantId/unsuspend', async (request, reply) => {
    const { tenantId } = request.params

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      throw Errors.notFound('Tenant')
    }

    const [updated] = await db.update(tenants).set({
      status: 'active',
      suspendedAt: null,
      suspensionReason: null,
      updatedAt: new Date(),
    }).where(eq(tenants.id, tenantId)).returning()

    return reply.send(updated)
  })

  // POST /api/v1/admin/tenants/:tenantId/promote — Promote sandbox → production
  app.post<{
    Params: { tenantId: string }
    Body: { dailySendLimit?: number }
  }>('/api/v1/admin/tenants/:tenantId/promote', async (request, reply) => {
    const { tenantId } = request.params
    const body = request.body as { dailySendLimit?: number } | undefined

    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    })

    if (!tenant) {
      throw Errors.notFound('Tenant')
    }

    const dailySendLimit = body?.dailySendLimit ?? 1000

    const [updated] = await db.update(tenants).set({
      mode: 'production',
      dailySendLimit,
      reviewedAt: new Date(),
      reviewedBy: request.userId!,
      updatedAt: new Date(),
    }).where(eq(tenants.id, tenantId)).returning()

    return reply.send(updated)
  })

  // GET /api/v1/admin/usage — Platform-wide stats for current month
  app.get('/api/v1/admin/usage', async (request, reply) => {
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [summary] = await db.select({
      emailsSent: sql<number>`COALESCE(SUM(${usageDaily.emailsSent}), 0)::int`,
      emailsDelivered: sql<number>`COALESCE(SUM(${usageDaily.emailsDelivered}), 0)::int`,
      emailsBounced: sql<number>`COALESCE(SUM(${usageDaily.emailsBounced}), 0)::int`,
      emailsComplained: sql<number>`COALESCE(SUM(${usageDaily.emailsComplained}), 0)::int`,
      emailsRejected: sql<number>`COALESCE(SUM(${usageDaily.emailsRejected}), 0)::int`,
    })
      .from(usageDaily)
      .where(gte(usageDaily.date, monthStart))

    const [tenantCount] = await db.select({ count: count() }).from(tenants).where(eq(tenants.status, 'active'))

    return reply.send({
      month: monthStart.slice(0, 7),
      activeTenants: tenantCount.count,
      ...summary,
    })
  })
}
