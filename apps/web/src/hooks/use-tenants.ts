import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'
import type { Tenant, CreateTenantRequest, UpdateTenantRequest } from '@mailhub/shared'

export function useTenants() {
  const { getToken, activeTenant } = useSession()
  const queryClient = useQueryClient()
  const tenantId = activeTenant?.id

  const create = useMutation({
    mutationFn: (data: CreateTenantRequest) =>
      apiClient<Tenant>('/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  const update = useMutation({
    mutationFn: (data: UpdateTenantRequest) =>
      apiClient<Tenant>(`/tenants/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  const remove = useMutation({
    mutationFn: () =>
      apiClient<Tenant>(`/tenants/${tenantId}`, {
        method: 'DELETE',
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
  })

  return { create, update, remove }
}
