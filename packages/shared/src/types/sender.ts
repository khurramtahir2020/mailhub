export interface SenderIdentity {
  id: string
  tenantId: string
  domainId: string
  email: string
  name: string | null
  isDefault: boolean
  createdAt: string
}
