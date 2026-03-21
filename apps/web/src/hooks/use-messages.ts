import { useQuery } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'
import type { PaginatedResponse, Message, MessageEvent } from '@mailhub/shared'

export function useMessages(params: { page?: number; status?: string; from?: string; to?: string; email?: string } = {}) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.set('page', String(params.page))
  if (params.status) queryParams.set('status', params.status)
  if (params.from) queryParams.set('from', params.from)
  if (params.to) queryParams.set('to', params.to)
  if (params.email) queryParams.set('email', params.email)

  return useQuery({
    queryKey: ['messages', tenantId, params],
    queryFn: () => apiClient<PaginatedResponse<Message>>(`/tenants/${tenantId}/messages?${queryParams}`, { getToken }),
    enabled: !!tenantId,
  })
}

export function useMessage(messageId: string | undefined) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id

  return useQuery({
    queryKey: ['message', tenantId, messageId],
    queryFn: () => apiClient<Message & { events: MessageEvent[] }>(`/tenants/${tenantId}/messages/${messageId}`, { getToken }),
    enabled: !!tenantId && !!messageId,
  })
}
