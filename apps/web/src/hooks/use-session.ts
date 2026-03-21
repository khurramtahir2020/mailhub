import { useAuth0 } from '@auth0/auth0-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback } from 'react'
import { apiClient } from '../api/client'
import type { UserSession } from '@mailhub/shared'

export function useSession() {
  const { getAccessTokenSilently, isAuthenticated, isLoading: authLoading } = useAuth0()
  const queryClient = useQueryClient()
  const [activeTenantId, setActiveTenantId] = useState<string | null>(() => {
    return localStorage.getItem('mailhub_active_tenant')
  })

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently()
    } catch {
      return undefined
    }
  }, [getAccessTokenSilently])

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: () => apiClient<UserSession>('/auth/session', { getToken }),
    enabled: isAuthenticated,
  })

  const signupComplete = useMutation({
    mutationFn: () =>
      apiClient<UserSession>('/auth/signup-complete', {
        method: 'POST',
        getToken,
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['session'], data)
      if (data.tenants.length > 0 && !activeTenantId) {
        switchTenant(data.tenants[0].id)
      }
    },
  })

  const switchTenant = useCallback((tenantId: string) => {
    setActiveTenantId(tenantId)
    localStorage.setItem('mailhub_active_tenant', tenantId)
  }, [])

  const activeTenant = session?.tenants.find(t => t.id === activeTenantId)
    || session?.tenants[0]
    || null

  return {
    user: session?.user ?? null,
    tenants: session?.tenants ?? [],
    activeTenant,
    switchTenant,
    signupComplete,
    getToken,
    isLoading: authLoading || sessionLoading,
    isAuthenticated,
  }
}
