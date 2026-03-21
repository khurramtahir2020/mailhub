import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZodError } from 'zod'
import { config } from './config.js'
import { createLogger } from './lib/logger.js'
import { AppError } from './lib/errors.js'
import { sqlClient } from './db/client.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { tenantRoutes } from './routes/tenants.js'
import { apiKeyRoutes } from './routes/api-keys.js'

const logger = createLogger(config.LOG_LEVEL)

const app = Fastify({ logger, bodyLimit: 1_048_576 })

// Plugins
await app.register(cors, {
  origin: config.NODE_ENV === 'development',
})

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// In production, serve React build
if (config.NODE_ENV === 'production') {
  await app.register(fastifyStatic, {
    root: path.join(__dirname, '../../web/dist'),
    prefix: '/',
    wildcard: false,
  })
}

// Global error handler
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
    })
  }

  const fastifyError = error as any
  if (fastifyError.validation) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: fastifyError.message },
    })
  }

  request.log.error(error)
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  })
})

// Routes
await app.register(healthRoutes)
await app.register(authRoutes)
await app.register(tenantRoutes)
await app.register(apiKeyRoutes)

// SPA fallback for production
if (config.NODE_ENV === 'production') {
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({
        error: { code: 'NOT_FOUND', message: 'Route not found' },
      })
    }
    return reply.sendFile('index.html')
  })
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'Shutting down')
  await app.close()
  await sqlClient.end()
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Start
try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.fatal(err)
  process.exit(1)
}
