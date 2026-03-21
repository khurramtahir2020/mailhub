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

    try {
      // Check if user already exists
      const existing = await db.query.users.findFirst({
        where: eq(users.auth0Sub, auth0Sub),
      })

      if (existing) {
        const userTenants = await db.query.tenants.findMany({
          where: eq(tenants.userId, existing.id),
        })
        return reply.send({ user: existing, tenants: userTenants })
      }

      // Create user
      const [user] = await db.insert(users).values({
        auth0Sub,
        email: auth0Email || 'unknown@example.com',
        name: null,
      }).returning()

      // Create default tenant
      const [tenant] = await db.insert(tenants).values({
        userId: user.id,
        name: 'My Project',
        slug: generateSlug('My Project'),
      }).returning()

      return reply.status(201).send({
        user,
        tenants: [tenant],
      })
    } catch (err) {
      request.log.error({ err, auth0Sub, auth0Email }, 'signup-complete failed')
      throw err
    }
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
