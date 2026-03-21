import type { FastifyRequest, FastifyReply } from 'fastify'
import { createRemoteJWKSet, jwtVerify } from 'jose'
import { createHash } from 'node:crypto'
import { eq, and } from 'drizzle-orm'
import { db } from '../db/client.js'
import { users, apiKeys, tenants } from '../db/schema.js'
import { Errors } from '../lib/errors.js'
import { config } from '../config.js'

const JWKS = createRemoteJWKSet(
  new URL(`https://${config.AUTH0_DOMAIN}/.well-known/jwks.json`)
)

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
    tenantId?: string
    authMethod?: 'jwt' | 'api_key'
  }
}

export async function requireJwt(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw Errors.unauthorized('Missing or invalid Authorization header')
  }

  const token = authHeader.slice(7)
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${config.AUTH0_DOMAIN}/`,
      audience: config.AUTH0_AUDIENCE,
    })

    const auth0Sub = payload.sub
    if (!auth0Sub) {
      throw Errors.unauthorized('Token missing subject claim')
    }

    const user = await db.query.users.findFirst({
      where: eq(users.auth0Sub, auth0Sub),
    })

    if (!user) {
      request.userId = undefined
      request.authMethod = 'jwt'
      ;(request as any).auth0Sub = auth0Sub
      ;(request as any).auth0Email = payload.email as string | undefined
      return
    }

    request.userId = user.id
    request.authMethod = 'jwt'
  } catch (err) {
    if (err instanceof Error && err.name === 'AppError') throw err
    throw Errors.unauthorized('Invalid or expired token')
  }
}

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string | undefined
  if (!apiKey) {
    throw Errors.unauthorized('Missing X-API-Key header')
  }

  const keyHash = createHash('sha256').update(apiKey).digest('hex')

  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.isRevoked, false)),
  })

  if (!key) {
    throw Errors.unauthorized('Invalid API key')
  }

  // Check tenant is active (security: deleted/suspended tenant keys must not work)
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, key.tenantId),
  })

  if (!tenant || tenant.status === 'deleted') {
    throw Errors.unauthorized('Invalid API key')
  }

  if (tenant.status === 'suspended') {
    throw Errors.tenantSuspended()
  }

  // Update last_used_at (fire and forget — don't block the request)
  db.update(apiKeys)
    .set({ lastUsedAt: new Date(), updatedAt: new Date() })
    .where(eq(apiKeys.id, key.id))
    .then(() => {})
    .catch(() => {})

  request.tenantId = key.tenantId
  request.authMethod = 'api_key'
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  if (!request.userId) {
    throw Errors.unauthorized('User not found. Complete signup first.')
  }
}
