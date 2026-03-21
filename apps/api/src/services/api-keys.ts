import { randomBytes, createHash } from 'node:crypto'
import { API_KEY_PREFIX } from '@mailhub/shared'

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function toBase62(buffer: Buffer): string {
  let result = ''
  for (const byte of buffer) {
    result += BASE62[byte % 62]
  }
  return result
}

export function generateApiKey(): { fullKey: string; prefix: string; hash: string } {
  const randomPart = toBase62(randomBytes(32))
  const fullKey = `${API_KEY_PREFIX}${randomPart}`
  const prefix = fullKey.slice(0, 16)
  const hash = createHash('sha256').update(fullKey).digest('hex')
  return { fullKey, prefix, hash }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}
