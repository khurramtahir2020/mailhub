import { z } from 'zod'

export const createSuppressionSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  reason: z.string().default('manual'),
})
