export interface Message {
  id: string
  tenantId: string
  contactId: string
  fromEmail: string
  toEmail: string
  subject: string
  templateId: string | null
  templateVersion: number | null
  status: 'accepted' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'rejected'
  sesMessageId: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageEvent {
  id: string
  messageId: string
  tenantId: string
  eventType: string
  rawEvent: any
  bounceType: string | null
  bounceSubtype: string | null
  createdAt: string
}
