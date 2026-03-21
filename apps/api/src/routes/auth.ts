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

    // Use onConflictDoNothing to handle race condition (concurrent signup requests)
    const result = await db.transaction(async (tx) => {
      const inserted = await tx.insert(users).values({
        auth0Sub,
        email: auth0Email || 'unknown@example.com',
        name: null,
      }).onConflictDoNothing({ target: users.auth0Sub }).returning()

      if (inserted.length === 0) {
        // Another request created the user — fetch and return
        const raceUser = await tx.query.users.findFirst({
          where: eq(users.auth0Sub, auth0Sub),
        })
        const raceTenants = await tx.query.tenants.findMany({
          where: eq(tenants.userId, raceUser!.id),
        })
        return { user: raceUser!, tenants: raceTenants, created: false }
      }

      const user = inserted[0]
      const [tenant] = await tx.insert(tenants).values({
        userId: user.id,
        name: 'My Project',
        slug: generateSlug('My Project'),
      }).returning()

      return { user, tenants: [tenant], created: true }
    })

    return reply.status(result.created ? 201 : 200).send({
      user: result.user,
      tenants: result.tenants,
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
