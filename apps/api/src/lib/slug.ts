import { randomBytes } from 'node:crypto'

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
  const suffix = randomBytes(4).toString('hex')
  return `${base}-${suffix}`
}
