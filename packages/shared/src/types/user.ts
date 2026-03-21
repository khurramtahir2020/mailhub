export interface User {
  id: string
  auth0Sub: string
  email: string
  name: string | null
  isPlatformAdmin: boolean
  createdAt: string
  updatedAt: string
}

export interface UserSession {
  user: User
  tenants: TenantSummary[]
}

export interface TenantSummary {
  id: string
  name: string
  slug: string
  status: string
  mode: string
}
