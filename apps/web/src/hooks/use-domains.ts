import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'
import type { Domain } from '@mailhub/shared'

export function useDomains() {
  const { activeTenant, getToken } = useSession()
  const queryClient = useQueryClient()
  const tenantId = activeTenant?.id

  const query = useQuery({
    queryKey: ['domains', tenantId],
    queryFn: () => apiClient<Domain[]>(`/tenants/${tenantId}/domains`, { getToken }),
    enabled: !!tenantId,
  })

  const add = useMutation({
    mutationFn: (domain: string) =>
      apiClient<Domain>(`/tenants/${tenantId}/domains`, {
        method: 'POST',
        body: JSON.stringify({ domain }),
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains', tenantId] }),
  })

  const verify = useMutation({
    mutationFn: (domainId: string) =>
      apiClient<Domain>(`/tenants/${tenantId}/domains/${domainId}/verify`, {
        method: 'POST',
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains', tenantId] }),
  })

  const remove = useMutation({
    mutationFn: (domainId: string) =>
      apiClient(`/tenants/${tenantId}/domains/${domainId}`, {
        method: 'DELETE',
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains', tenantId] }),
  })

  return { domains: query.data ?? [], isLoading: query.isLoading, add, verify, remove }
}

export function useDomain(domainId: string | undefined) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id

  return useQuery({
    queryKey: ['domain', tenantId, domainId],
    queryFn: () => apiClient<Domain>(`/tenants/${tenantId}/domains/${domainId}`, { getToken }),
    enabled: !!tenantId && !!domainId,
  })
}
