import { z } from 'zod'

export const createDomainSchema = z.object({
  domain: z.string().min(1).max(255).trim().toLowerCase()
    .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/, 'Invalid domain format'),
})
