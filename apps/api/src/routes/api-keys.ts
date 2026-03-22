import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { apiKeys, domains } from '../db/schema.js'
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

    let domainId: string | undefined
    let domainName: string | null = null

    if (body.domain_id) {
      const domain = await db.query.domains.findFirst({
        where: and(
          eq(domains.id, body.domain_id),
          eq(domains.tenantId, request.tenantId!),
        ),
      })

      if (!domain) {
        throw Errors.notFound('Domain')
      }

      if (domain.status !== 'verified') {
        throw Errors.validation('Domain must be verified before it can be used to scope an API key')
      }

      domainId = domain.id
      domainName = domain.domain
    }

    const [key] = await db.insert(apiKeys).values({
      tenantId: request.tenantId!,
      name: body.name,
      keyPrefix: prefix,
      keyHash: hash,
      scope: body.scope,
      domainId: domainId ?? null,
    }).returning()

    return reply.status(201).send({
      key: fullKey,
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scope: key.scope,
      domainId: key.domainId ?? null,
      domainName,
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
        domainId: true,
        lastUsedAt: true,
        isRevoked: true,
        createdAt: true,
      },
      with: {
        domain: {
          columns: { domain: true },
        },
      },
      orderBy: (keys, { desc }) => [desc(keys.createdAt)],
    })

    const result = keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      scope: k.scope,
      domainId: k.domainId ?? null,
      domainName: k.domain?.domain ?? null,
      lastUsedAt: k.lastUsedAt,
      isRevoked: k.isRevoked,
      createdAt: k.createdAt,
    }))

    return reply.send(result)
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
