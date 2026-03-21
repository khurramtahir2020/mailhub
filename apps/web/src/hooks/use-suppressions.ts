import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'
import type { PaginatedResponse, Suppression } from '@mailhub/shared'

export function useSuppressions(params: { page?: number; reason?: string } = {}) {
  const { activeTenant, getToken } = useSession()
  const queryClient = useQueryClient()
  const tenantId = activeTenant?.id
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.set('page', String(params.page))
  if (params.reason) queryParams.set('reason', params.reason)

  const query = useQuery({
    queryKey: ['suppressions', tenantId, params],
    queryFn: () => apiClient<PaginatedResponse<Suppression>>(`/tenants/${tenantId}/suppressions?${queryParams}`, { getToken }),
    enabled: !!tenantId,
  })

  const add = useMutation({
    mutationFn: (data: { email: string; reason?: string }) =>
      apiClient<Suppression>(`/tenants/${tenantId}/suppressions`, {
        method: 'POST',
        body: JSON.stringify(data),
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppressions', tenantId] }),
  })

  const remove = useMutation({
    mutationFn: (suppressionId: string) =>
      apiClient(`/tenants/${tenantId}/suppressions/${suppressionId}`, {
        method: 'DELETE',
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppressions', tenantId] }),
  })

  return { suppressions: query.data, isLoading: query.isLoading, add, remove }
}
