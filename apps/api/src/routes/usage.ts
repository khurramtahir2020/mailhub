import type { FastifyInstance } from 'fastify'
import { eq, and, gte, lte, asc, sql } from 'drizzle-orm'
import { db } from '../db/client.js'
import { usageDaily } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'

export async function usageRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  // GET /api/v1/tenants/:tenantId/usage — Usage by date range
  app.get<{
    Params: { tenantId: string }
    Querystring: { from?: string; to?: string }
  }>('/api/v1/tenants/:tenantId/usage', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const tenantId = request.tenantId!
    const { from, to } = request.query

    const conditions = [eq(usageDaily.tenantId, tenantId)]

    if (from) {
      conditions.push(gte(usageDaily.date, from))
    }
    if (to) {
      conditions.push(lte(usageDaily.date, to))
    }

    const data = await db.select()
      .from(usageDaily)
      .where(and(...conditions))
      .orderBy(asc(usageDaily.date))

    return reply.send(data)
  })

  // GET /api/v1/tenants/:tenantId/usage/summary — Current month summary
  app.get<{
    Params: { tenantId: string }
  }>('/api/v1/tenants/:tenantId/usage/summary', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const tenantId = request.tenantId!

    // Current month: first day to today
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
      .where(and(
        eq(usageDaily.tenantId, tenantId),
        gte(usageDaily.date, monthStart),
      ))

    return reply.send(summary)
  })
}
