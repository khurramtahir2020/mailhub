import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users, tenants } from '../db/schema.js'
import { requireJwt, requireUser } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { generateSlug } from '../lib/slug.js'

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/v1/auth/signup-complete', {
    preHandler: [requireJwt],
  }, async (request, reply) => {
    const auth0Sub = (request as any).auth0Sub as string
    const auth0Email = (request as any).auth0Email as string | undefined

    if (!auth0Sub) {
      throw Errors.unauthorized('Missing auth0 subject')
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.auth0Sub, auth0Sub),
    })

    if (existing) {
      const userTenants = await db.query.tenants.findMany({
        where: eq(tenants.userId, existing.id),
      })
      return reply.send({ user: existing, tenants: userTenants })
    }

    const result = await db.transaction(async (tx) => {
      const [user] = await tx.insert(users).values({
        auth0Sub,
        email: auth0Email || 'unknown@example.com',
        name: null,
      }).returning()

      const [tenant] = await tx.insert(tenants).values({
        userId: user.id,
        name: 'My Project',
        slug: generateSlug('My Project'),
      }).returning()

      return { user, tenant }
    })

    return reply.status(201).send({
      user: result.user,
      tenants: [result.tenant],
    })
  })

  app.get('/api/v1/auth/session', {
    preHandler: [requireJwt, requireUser],
  }, async (request, reply) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, request.userId!),
    })

    if (!user) {
      throw Errors.notFound('User')
    }

    const userTenants = await db.query.tenants.findMany({
      where: eq(tenants.userId, user.id),
    })

    return reply.send({
      user,
      tenants: userTenants.filter(t => t.status !== 'deleted'),
    })
  })
}
