import { z } from 'zod'

export const createTenantSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).trim(),
})
