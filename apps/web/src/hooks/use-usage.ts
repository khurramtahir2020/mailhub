import { useQuery } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'

interface UsageDaily {
  date: string
  emailsSent: number
  emailsDelivered: number
  emailsBounced: number
  emailsComplained: number
  emailsRejected: number
}

interface UsageSummary {
  emailsSent: number
  emailsDelivered: number
  emailsBounced: number
  emailsComplained: number
  emailsRejected: number
}

export function useUsage(from?: string, to?: string) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id
  const queryParams = new URLSearchParams()
  if (from) queryParams.set('from', from)
  if (to) queryParams.set('to', to)

  return useQuery({
    queryKey: ['usage', tenantId, from, to],
    queryFn: () => apiClient<UsageDaily[]>(`/tenants/${tenantId}/usage?${queryParams}`, { getToken }),
    enabled: !!tenantId,
  })
}

export function useUsageSummary() {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id

  return useQuery({
    queryKey: ['usage-summary', tenantId],
    queryFn: () => apiClient<UsageSummary>(`/tenants/${tenantId}/usage/summary`, { getToken }),
    enabled: !!tenantId,
  })
}
