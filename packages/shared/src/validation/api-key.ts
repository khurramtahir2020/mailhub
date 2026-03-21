import { z } from 'zod'

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  scope: z.enum(['send_only', 'full_access']).default('send_only'),
})
