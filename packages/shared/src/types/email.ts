export interface SendEmailRequest {
  from: string
  to: string
  subject?: string
  html?: string
  text?: string
  template?: string
  template_version?: number
  variables?: Record<string, string>
  idempotency_key?: string
}

export interface SendEmailResponse {
  id: string
  status: string
  ses_message_id: string
  contact_id: string
}
