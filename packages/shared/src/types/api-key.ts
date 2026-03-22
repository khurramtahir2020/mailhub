export interface ApiKey {
  id: string
  tenantId: string
  name: string
  keyPrefix: string
  scope: 'send_only' | 'full_access'
  domainId: string | null
  domainName: string | null
  lastUsedAt: string | null
  isRevoked: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateApiKeyRequest {
  name: string
  scope?: 'send_only' | 'full_access'
  domain_id?: string
}

export interface CreateApiKeyResponse {
  key: string
  id: string
  name: string
  keyPrefix: string
  scope: string
  domainId: string | null
  domainName: string | null
}
