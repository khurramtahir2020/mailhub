export interface Tenant {
  id: string
  userId: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'deleted'
  mode: 'sandbox' | 'production'
  dailySendLimit: number
  reviewedAt: string | null
  reviewedBy: string | null
  suspendedAt: string | null
  suspensionReason: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateTenantRequest {
  name: string
}

export interface UpdateTenantRequest {
  name: string
}
