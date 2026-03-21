import type { FastifyRequest, FastifyReply } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { tenants } from '../db/schema.js'
import { Errors } from '../lib/errors.js'

export async function requireTenantOwnership(request: FastifyRequest, reply: FastifyReply) {
  if (!request.userId) {
    throw Errors.unauthorized('Authentication required')
  }

  const tenantId = (request.params as any).tenantId
  if (!tenantId) {
    throw Errors.validation('Missing tenantId parameter')
  }

  const tenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.id, tenantId), eq(tenants.userId, request.userId)),
  })

  if (!tenant) {
    throw Errors.notFound('Tenant')
  }

  if (tenant.status === 'suspended') {
    throw Errors.tenantSuspended()
  }

  if (tenant.status === 'deleted') {
    throw Errors.notFound('Tenant')
  }

  request.tenantId = tenant.id
}
