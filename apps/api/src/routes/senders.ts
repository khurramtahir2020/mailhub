import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { senderIdentities, domains } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'
import { createSenderSchema } from '@mailhub/shared'
import { Errors } from '../lib/errors.js'

export async function senderRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  // POST /api/v1/tenants/:tenantId/senders — Create sender identity
  app.post<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId/senders', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const body = createSenderSchema.parse(request.body)

    // Extract domain from email
    const emailDomain = body.email.split('@')[1]
    if (!emailDomain) {
      throw Errors.validation('Invalid email address')
    }

    // Verify the domain belongs to this tenant and is verified
    const domain = await db.query.domains.findFirst({
      where: and(
        eq(domains.tenantId, request.tenantId!),
        eq(domains.domain, emailDomain),
      ),
    })

    if (!domain) {
      return reply.status(422).send({
        error: { code: 'DOMAIN_NOT_FOUND', message: 'Domain does not belong to this tenant' },
      })
    }

    if (domain.status !== 'verified') {
      return reply.status(422).send({
        error: { code: 'DOMAIN_NOT_VERIFIED', message: 'Domain must be verified before adding sender identities' },
      })
    }

    try {
      const [sender] = await db.insert(senderIdentities).values({
        tenantId: request.tenantId!,
        domainId: domain.id,
        email: body.email,
        name: body.name,
      }).returning()

      return reply.status(201).send(sender)
    } catch (err: any) {
      if (err.code === '23505') {
        throw Errors.conflict('Sender identity with this email already exists')
      }
      throw err
    }
  })

  // GET /api/v1/tenants/:tenantId/senders — List senders
  app.get<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId/senders', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const senders = await db.query.senderIdentities.findMany({
      where: eq(senderIdentities.tenantId, request.tenantId!),
    })
    return reply.send(senders)
  })

  // DELETE /api/v1/tenants/:tenantId/senders/:senderId — Delete sender
  app.delete<{ Params: { tenantId: string; senderId: string } }>('/api/v1/tenants/:tenantId/senders/:senderId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const sender = await db.query.senderIdentities.findFirst({
      where: and(
        eq(senderIdentities.id, request.params.senderId),
        eq(senderIdentities.tenantId, request.tenantId!),
      ),
    })
    if (!sender) throw Errors.notFound('Sender identity')

    await db.delete(senderIdentities).where(eq(senderIdentities.id, sender.id))

    return reply.status(204).send()
  })
}
