import { z } from 'zod'

export const sendEmailSchema = z.object({
  from: z.string().min(1).max(500).refine(
    (v) => /^[^\r\n]*$/.test(v),
    { message: 'From address contains invalid characters' }
  ),
  to: z.string().email().max(255),
  subject: z.string().min(1).max(500).optional(),
  html: z.string().optional(),
  text: z.string().optional(),
  template: z.string().optional(),
  template_version: z.number().int().positive().optional(),
  variables: z.record(z.string()).optional(),
  idempotency_key: z.string().max(255).optional(),
}).refine(
  (data) => (data.subject && (data.html || data.text)) || data.template,
  { message: 'Provide either subject+body (html/text) for raw send, or template name for template send' }
)
