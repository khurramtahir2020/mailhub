export interface Suppression {
  id: string
  tenantId: string | null
  email: string
  reason: string
  sourceMessageId: string | null
  createdAt: string
}
