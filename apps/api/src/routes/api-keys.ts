import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { apiKeys } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'
import { createApiKeySchema } from '@mailhub/shared'
import { generateApiKey } from '../services/api-keys.js'
import { Errors } from '../lib/errors.js'

export async function apiKeyRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  app.post<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId/api-keys', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const body = createApiKeySchema.parse(request.body)
    const { fullKey, prefix, hash } = generateApiKey()

    const [key] = await db.insert(apiKeys).values({
      tenantId: request.tenantId!,
      name: body.name,
      keyPrefix: prefix,
      keyHash: hash,
      scope: body.scope,
    }).returning()

    return reply.status(201).send({
      key: fullKey,
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scope: key.scope,
    })
  })

  app.get<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId/api-keys', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const keys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.tenantId, request.tenantId!),
      columns: {
        id: true,
        name: true,
        keyPrefix: true,
        scope: true,
        lastUsedAt: true,
        isRevoked: true,
        createdAt: true,
      },
      orderBy: (keys, { desc }) => [desc(keys.createdAt)],
    })
    return reply.send(keys)
  })

  app.delete<{ Params: { tenantId: string; keyId: string } }>(
    '/api/v1/tenants/:tenantId/api-keys/:keyId',
    { preHandler: [requireTenantOwnership] },
    async (request, reply) => {
      const { keyId } = request.params

      const key = await db.query.apiKeys.findFirst({
        where: and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, request.tenantId!)),
      })

      if (!key) {
        throw Errors.notFound('API key')
      }

      await db
        .update(apiKeys)
        .set({ isRevoked: true, updatedAt: new Date() })
        .where(eq(apiKeys.id, keyId))

      return reply.send({ success: true })
    },
  )
}
