import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { tenants } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'
import { createTenantSchema, updateTenantSchema } from '@mailhub/shared'
import { Errors } from '../lib/errors.js'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) + '-' + Math.random().toString(36).slice(2, 8)
}

export async function tenantRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  app.post('/api/v1/tenants', async (request, reply) => {
    const body = createTenantSchema.parse(request.body)
    const [tenant] = await db.insert(tenants).values({
      userId: request.userId!,
      name: body.name,
      slug: generateSlug(body.name),
    }).returning()
    return reply.status(201).send(tenant)
  })

  app.get('/api/v1/tenants', async (request, reply) => {
    const userTenants = await db.query.tenants.findMany({
      where: eq(tenants.userId, request.userId!),
    })
    return reply.send(userTenants.filter(t => t.status !== 'deleted'))
  })

  app.get<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, request.tenantId!),
    })
    return reply.send(tenant)
  })

  app.patch<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const body = updateTenantSchema.parse(request.body)
    const [updated] = await db
      .update(tenants)
      .set({ name: body.name, updatedAt: new Date() })
      .where(eq(tenants.id, request.tenantId!))
      .returning()
    return reply.send(updated)
  })

  app.delete<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const [updated] = await db
      .update(tenants)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(tenants.id, request.tenantId!))
      .returning()
    return reply.send(updated)
  })
}
