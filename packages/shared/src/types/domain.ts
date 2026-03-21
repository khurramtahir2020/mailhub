export interface Domain {
  id: string
  tenantId: string
  domain: string
  status: 'pending' | 'verified' | 'failed'
  sesIdentityArn: string | null
  verificationToken: string | null
  dkimTokens: any
  dnsRecords: any
  spfVerified: boolean
  dkimVerified: boolean
  dmarcVerified: boolean
  dmarcPolicy: string | null
  verifiedAt: string | null
  createdAt: string
  updatedAt: string
}
