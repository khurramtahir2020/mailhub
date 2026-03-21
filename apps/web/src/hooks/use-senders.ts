import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'
import type { SenderIdentity } from '@mailhub/shared'

export function useSenders() {
  const { activeTenant, getToken } = useSession()
  const queryClient = useQueryClient()
  const tenantId = activeTenant?.id

  const query = useQuery({
    queryKey: ['senders', tenantId],
    queryFn: () => apiClient<SenderIdentity[]>(`/tenants/${tenantId}/senders`, { getToken }),
    enabled: !!tenantId,
  })

  const add = useMutation({
    mutationFn: (data: { email: string; name?: string }) =>
      apiClient<SenderIdentity>(`/tenants/${tenantId}/senders`, {
        method: 'POST',
        body: JSON.stringify(data),
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['senders', tenantId] }),
  })

  const remove = useMutation({
    mutationFn: (senderId: string) =>
      apiClient(`/tenants/${tenantId}/senders/${senderId}`, {
        method: 'DELETE',
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['senders', tenantId] }),
  })

  return { senders: query.data ?? [], isLoading: query.isLoading, add, remove }
}
