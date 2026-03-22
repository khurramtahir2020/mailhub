import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'

interface AdminTenant {
  id: string
  name: string
  slug: string
  status: string
  mode: string
  dailySendLimit: number
  ownerEmail: string
  emailsSentThisMonth: number
  createdAt: string
  suspendedAt: string | null
  suspensionReason: string | null
}

interface AdminTenantDetail extends AdminTenant {
  domainCount: number
  contactCount: number
  messageCount: number
  usage: any[]
}

interface PlatformUsage {
  emailsSent: number
  emailsDelivered: number
  emailsBounced: number
  emailsComplained: number
  emailsRejected: number
}

export function useAdminTenants(page = 1) {
  const { getToken } = useSession()
  return useQuery({
    queryKey: ['admin-tenants', page],
    queryFn: () => apiClient<{ data: AdminTenant[]; total: number; page: number; limit: number; pages: number }>(`/admin/tenants?page=${page}`, { getToken }),
  })
}

export function useAdminTenant(tenantId: string | undefined) {
  const { getToken } = useSession()
  return useQuery({
    queryKey: ['admin-tenant', tenantId],
    queryFn: () => apiClient<AdminTenantDetail>(`/admin/tenants/${tenantId}`, { getToken }),
    enabled: !!tenantId,
  })
}

export function useAdminActions() {
  const { getToken } = useSession()
  const queryClient = useQueryClient()

  const suspend = useMutation({
    mutationFn: ({ tenantId, reason }: { tenantId: string; reason: string }) =>
      apiClient(`/admin/tenants/${tenantId}/suspend`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['admin-tenant'] })
    },
  })

  const unsuspend = useMutation({
    mutationFn: (tenantId: string) =>
      apiClient(`/admin/tenants/${tenantId}/unsuspend`, { method: 'POST', getToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['admin-tenant'] })
    },
  })

  const promote = useMutation({
    mutationFn: ({ tenantId, dailySendLimit }: { tenantId: string; dailySendLimit?: number }) =>
      apiClient(`/admin/tenants/${tenantId}/promote`, {
        method: 'POST',
        body: JSON.stringify({ dailySendLimit }),
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['admin-tenant'] })
    },
  })

  return { suspend, unsuspend, promote }
}

export function useAdminUsage() {
  const { getToken } = useSession()
  return useQuery({
    queryKey: ['admin-usage'],
    queryFn: () => apiClient<PlatformUsage>('/admin/usage', { getToken }),
  })
}
