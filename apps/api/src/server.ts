import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import { config } from './config.js'
import { createLogger } from './lib/logger.js'
import { AppError } from './lib/errors.js'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'

const logger = createLogger(config.LOG_LEVEL)

const app = Fastify({ logger })

// Plugins
await app.register(cors, {
  origin: config.NODE_ENV === 'development',
})

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

// Global error handler
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message },
    })
  }

  if (error.validation) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: error.message },
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

// Start
try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.fatal(err)
  process.exit(1)
}
