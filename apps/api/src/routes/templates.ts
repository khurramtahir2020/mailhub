import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { templates, templateVersions } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { requireTenantOwnership } from '../middleware/tenant.js'
import { createTemplateSchema, updateTemplateSchema } from '@mailhub/shared'
import { Errors } from '../lib/errors.js'

export async function templateRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireJwt)
  app.addHook('preHandler', requireUser)

  // POST /api/v1/tenants/:tenantId/templates — Create template + version 1
  app.post<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId/templates', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const body = createTemplateSchema.parse(request.body)

    try {
      // Transaction: insert template + first version
      const result = await db.transaction(async (tx) => {
        const [template] = await tx.insert(templates).values({
          tenantId: request.tenantId!,
          name: body.name,
          description: body.description,
          currentVersion: 1,
        }).returning()

        const [version] = await tx.insert(templateVersions).values({
          templateId: template.id,
          version: 1,
          subject: body.subject,
          htmlBody: body.html_body,
          textBody: body.text_body,
          variables: body.variables,
        }).returning()

        return { ...template, currentVersionContent: version }
      })

      return reply.status(201).send(result)
    } catch (err: any) {
      if (err.code === '23505') {
        throw Errors.conflict('Template with this name already exists')
      }
      throw err
    }
  })

  // GET /api/v1/tenants/:tenantId/templates — List templates
  app.get<{ Params: { tenantId: string } }>('/api/v1/tenants/:tenantId/templates', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const templateList = await db.query.templates.findMany({
      where: eq(templates.tenantId, request.tenantId!),
    })
    return reply.send(templateList)
  })

  // GET /api/v1/tenants/:tenantId/templates/:templateId — Template detail with current version
  app.get<{ Params: { tenantId: string; templateId: string } }>('/api/v1/tenants/:tenantId/templates/:templateId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, request.params.templateId), eq(templates.tenantId, request.tenantId!)),
    })
    if (!template) throw Errors.notFound('Template')

    const version = await db.query.templateVersions.findFirst({
      where: and(
        eq(templateVersions.templateId, template.id),
        eq(templateVersions.version, template.currentVersion),
      ),
    })

    return reply.send({ ...template, currentVersionContent: version })
  })

  // PUT /api/v1/tenants/:tenantId/templates/:templateId — Create new version
  app.put<{ Params: { tenantId: string; templateId: string } }>('/api/v1/tenants/:tenantId/templates/:templateId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const body = updateTemplateSchema.parse(request.body)

    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, request.params.templateId), eq(templates.tenantId, request.tenantId!)),
    })
    if (!template) throw Errors.notFound('Template')

    const result = await db.transaction(async (tx) => {
      const newVersion = template.currentVersion + 1

      const [version] = await tx.insert(templateVersions).values({
        templateId: template.id,
        version: newVersion,
        subject: body.subject,
        htmlBody: body.html_body,
        textBody: body.text_body,
        variables: body.variables,
      }).returning()

      const [updated] = await tx
        .update(templates)
        .set({ currentVersion: newVersion, updatedAt: new Date() })
        .where(eq(templates.id, template.id))
        .returning()

      return { ...updated, currentVersionContent: version }
    })

    return reply.send(result)
  })

  // GET /api/v1/tenants/:tenantId/templates/:templateId/versions — List all versions
  app.get<{ Params: { tenantId: string; templateId: string } }>('/api/v1/tenants/:tenantId/templates/:templateId/versions', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, request.params.templateId), eq(templates.tenantId, request.tenantId!)),
    })
    if (!template) throw Errors.notFound('Template')

    const versions = await db.query.templateVersions.findMany({
      where: eq(templateVersions.templateId, template.id),
    })
    return reply.send(versions)
  })

  // GET /api/v1/tenants/:tenantId/templates/:templateId/versions/:version — Specific version
  app.get<{ Params: { tenantId: string; templateId: string; version: string } }>('/api/v1/tenants/:tenantId/templates/:templateId/versions/:version', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, request.params.templateId), eq(templates.tenantId, request.tenantId!)),
    })
    if (!template) throw Errors.notFound('Template')

    const versionNum = parseInt(request.params.version, 10)
    if (isNaN(versionNum)) throw Errors.validation('Invalid version number')

    const version = await db.query.templateVersions.findFirst({
      where: and(
        eq(templateVersions.templateId, template.id),
        eq(templateVersions.version, versionNum),
      ),
    })
    if (!version) throw Errors.notFound('Template version')

    return reply.send(version)
  })

  // DELETE /api/v1/tenants/:tenantId/templates/:templateId — Delete template and all versions
  app.delete<{ Params: { tenantId: string; templateId: string } }>('/api/v1/tenants/:tenantId/templates/:templateId', {
    preHandler: [requireTenantOwnership],
  }, async (request, reply) => {
    const template = await db.query.templates.findFirst({
      where: and(eq(templates.id, request.params.templateId), eq(templates.tenantId, request.tenantId!)),
    })
    if (!template) throw Errors.notFound('Template')

    await db.transaction(async (tx) => {
      await tx.delete(templateVersions).where(eq(templateVersions.templateId, template.id))
      await tx.delete(templates).where(eq(templates.id, template.id))
    })

    return reply.status(204).send()
  })
}
