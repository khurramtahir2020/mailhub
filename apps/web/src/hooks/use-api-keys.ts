import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'
import type { ApiKey, CreateApiKeyRequest, CreateApiKeyResponse } from '@mailhub/shared'

export function useApiKeys() {
  const { activeTenant, getToken } = useSession()
  const queryClient = useQueryClient()
  const tenantId = activeTenant?.id

  const query = useQuery({
    queryKey: ['api-keys', tenantId],
    queryFn: () =>
      apiClient<ApiKey[]>(`/tenants/${tenantId}/api-keys`, { getToken }),
    enabled: !!tenantId,
  })

  const create = useMutation({
    mutationFn: (data: CreateApiKeyRequest) =>
      apiClient<CreateApiKeyResponse>(`/tenants/${tenantId}/api-keys`, {
        method: 'POST',
        body: JSON.stringify(data),
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', tenantId] })
    },
  })

  const revoke = useMutation({
    mutationFn: (keyId: string) =>
      apiClient(`/tenants/${tenantId}/api-keys/${keyId}`, {
        method: 'DELETE',
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys', tenantId] })
    },
  })

  return { keys: query.data ?? [], isLoading: query.isLoading, create, revoke }
}
