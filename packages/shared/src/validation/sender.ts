import { z } from 'zod'

export const createSenderSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  name: z.string().max(100).trim().optional(),
})
