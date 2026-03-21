import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db/client.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async (request, reply) => {
    try {
      await db.execute(sql`SELECT 1`)
      return reply.send({ status: 'ok', db: 'connected' })
    } catch {
      return reply.status(503).send({ status: 'error', db: 'disconnected' })
    }
  })
}
