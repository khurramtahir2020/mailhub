export interface Contact {
  id: string
  tenantId: string
  email: string
  status: 'active' | 'suppressed'
  suppressionReason: string | null
  firstSeenAt: string
  lastEmailedAt: string | null
  totalSent: number
  totalDelivered: number
  totalBounced: number
  totalComplained: number
  createdAt: string
  updatedAt: string
}
