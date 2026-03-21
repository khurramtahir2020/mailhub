import type { FastifyRequest, FastifyReply } from 'fastify'
import { eq } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users } from '../db/schema.js'
import { Errors } from '../lib/errors.js'

export async function requirePlatformAdmin(request: FastifyRequest, reply: FastifyReply) {
  if (!request.userId) {
    throw Errors.unauthorized('Authentication required')
  }
  const user = await db.query.users.findFirst({
    where: eq(users.id, request.userId),
  })
  if (!user?.isPlatformAdmin) {
    throw Errors.forbidden('Platform admin access required')
  }
}
