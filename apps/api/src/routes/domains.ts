import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { domains, senderIdentities, apiKeys } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'
import { createDomainSchema, BLOCKED_DOMAINS } from '@mailhub/shared'
import { createDomainIdentity, deleteDomainIdentity, getDomainIdentity } from '../services/ses.js'
import { checkSpf, checkDmarc, checkDkimCname } from '../services/dns.js'
import { Errors } from '../lib/errors.js'

export async function domainRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  // POST /api/v1/tenants/:tenantId/domains — Add domain
  app.post<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId/domains', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const body = createDomainSchema.parse(request.body)

    if (BLOCKED_DOMAINS.has(body.domain)) {
      return reply.status(422).send({
        error: { code: 'BLOCKED_DOMAIN', message: 'Public email provider domains are not allowed' },
      })
    }

    // Try SES identity creation
    let dkimTokens: string[] = []
    let sesIdentityArn: string | undefined
    let verificationToken: string | undefined

    try {
      const sesResult = await createDomainIdentity(body.domain)
      dkimTokens = sesResult.DkimAttributes?.Tokens ?? []
      // SES doesn't return ARN directly in CreateEmailIdentity response
    } catch (err) {
      request.log.warn({ err, domain: body.domain }, 'SES createDomainIdentity failed — storing domain in pending state')
    }

    // Build DNS records JSONB
    const dnsRecords = {
      dkim: dkimTokens.map(token => ({
        type: 'CNAME',
        name: `${token}._domainkey.${body.domain}`,
        value: `${token}.dkim.amazonses.com`,
      })),
      spf: {
        type: 'TXT',
        name: body.domain,
        value: 'v=spf1 include:amazonses.com ~all',
      },
      dmarc: {
        type: 'TXT',
        name: `_dmarc.${body.domain}`,
        value: 'v=DMARC1; p=none;',
      },
    }

    try {
      const [domain] = await db.insert(domains).values({
        tenantId: request.tenantId!,
        domain: body.domain,
        status: 'pending',
        dkimTokens,
        dnsRecords,
        verificationToken,
        sesIdentityArn,
      }).returning()

      return reply.status(201).send(domain)
    } catch (err: any) {
      if (err.code === '23505') {
        throw Errors.conflict('Domain already exists')
      }
      throw err
    }
  })

  // GET /api/v1/tenants/:tenantId/domains — List domains
  app.get<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId/domains', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const domainList = await db.query.domains.findMany({
      where: eq(domains.tenantId, request.tenantId!),
    })
    return reply.send(domainList)
  })

  // GET /api/v1/tenants/:tenantId/domains/:domainId — Domain detail
  app.get<{ Params: { tenantId: string; domainId: string } }>('/api/v1/tenants/:tenantId/domains/:domainId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, request.params.domainId), eq(domains.tenantId, request.tenantId!)),
    })
    if (!domain) throw Errors.notFound('Domain')
    return reply.send(domain)
  })

  // POST /api/v1/tenants/:tenantId/domains/:domainId/verify — Trigger DNS check
  app.post<{ Params: { tenantId: string; domainId: string } }>('/api/v1/tenants/:tenantId/domains/:domainId/verify', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, request.params.domainId), eq(domains.tenantId, request.tenantId!)),
    })
    if (!domain) throw Errors.notFound('Domain')

    let dkimVerified = false
    let spfVerified = false
    let dmarcVerified = false
    let dmarcPolicy: string | null = null

    // Check SES verification status
    try {
      const sesIdentity = await getDomainIdentity(domain.domain)
      if (sesIdentity.DkimAttributes?.Status === 'SUCCESS') {
        dkimVerified = true
      }
    } catch (err) {
      request.log.warn({ err, domain: domain.domain }, 'SES getDomainIdentity failed')
    }

    // Run DNS checks
    spfVerified = await checkSpf(domain.domain)

    const dmarcResult = await checkDmarc(domain.domain)
    dmarcVerified = dmarcResult.exists
    dmarcPolicy = dmarcResult.policy

    // Check DKIM CNAME records
    const tokens = (domain.dkimTokens as string[]) ?? []
    if (tokens.length > 0) {
      const dkimResults = await Promise.all(
        tokens.map(token => checkDkimCname(`${token}._domainkey.${domain.domain}`))
      )
      // All DKIM CNAMEs must be present
      if (dkimResults.every(Boolean)) {
        dkimVerified = true
      }
    }

    const newStatus = dkimVerified ? 'verified' : domain.status
    const verifiedAt = dkimVerified && !domain.verifiedAt ? new Date() : domain.verifiedAt

    const [updated] = await db
      .update(domains)
      .set({
        spfVerified,
        dkimVerified,
        dmarcVerified,
        dmarcPolicy,
        status: newStatus,
        verifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(domains.id, domain.id))
      .returning()

    return reply.send(updated)
  })

  // DELETE /api/v1/tenants/:tenantId/domains/:domainId — Remove domain
  app.delete<{ Params: { tenantId: string; domainId: string } }>('/api/v1/tenants/:tenantId/domains/:domainId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const domain = await db.query.domains.findFirst({
      where: and(eq(domains.id, request.params.domainId), eq(domains.tenantId, request.tenantId!)),
    })
    if (!domain) throw Errors.notFound('Domain')

    // Delete SES identity (best effort)
    try {
      await deleteDomainIdentity(domain.domain)
    } catch (err) {
      request.log.warn({ err, domain: domain.domain }, 'SES deleteDomainIdentity failed')
    }

    // Revoke API keys scoped to this domain
    await db.update(apiKeys)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(and(eq(apiKeys.domainId, domain.id), eq(apiKeys.isRevoked, false)))

    // Delete associated sender identities
    await db.delete(senderIdentities).where(eq(senderIdentities.domainId, domain.id))

    // Delete domain record
    await db.delete(domains).where(eq(domains.id, domain.id))

    return reply.status(204).send()
  })
}
