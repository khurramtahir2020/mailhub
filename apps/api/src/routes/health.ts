import type { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'
import { db } from '../db/client.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    try {
      await db.execute(sql`SELECT 1`)
      return { status: 'ok', db: 'connected' }
    } catch {
      return { status: 'error', db: 'disconnected' }
    }
  })
}
