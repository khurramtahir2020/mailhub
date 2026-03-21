import { z } from 'zod'

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(100).trim().regex(/^[a-z0-9-_]+$/, 'Name must be lowercase alphanumeric with hyphens/underscores'),
  description: z.string().max(500).trim().optional(),
  subject: z.string().min(1).max(500),
  html_body: z.string().optional(),
  text_body: z.string().optional(),
  variables: z.array(z.string()).optional(),
})

export const updateTemplateSchema = z.object({
  subject: z.string().min(1).max(500),
  html_body: z.string().optional(),
  text_body: z.string().optional(),
  variables: z.array(z.string()).optional(),
})
