import { randomBytes, createHash } from 'node:crypto'
import { API_KEY_PREFIX } from '@mailhub/shared'

export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const randomPart = randomBytes(32).toString('base64url').slice(0, 32)
  const fullKey = `${API_KEY_PREFIX}${randomPart}`
  const prefix = fullKey.slice(0, 16)
  const hash = createHash('sha256').update(fullKey).digest('hex')
  return { fullKey, prefix, hash }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}
