import { useQuery } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'
import type { PaginatedResponse, Contact, Message } from '@mailhub/shared'

export function useContacts(params: { page?: number; search?: string; status?: string } = {}) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id
  const queryParams = new URLSearchParams()
  if (params.page) queryParams.set('page', String(params.page))
  if (params.search) queryParams.set('search', params.search)
  if (params.status) queryParams.set('status', params.status)

  return useQuery({
    queryKey: ['contacts', tenantId, params],
    queryFn: () => apiClient<PaginatedResponse<Contact>>(`/tenants/${tenantId}/contacts?${queryParams}`, { getToken }),
    enabled: !!tenantId,
  })
}

export function useContact(contactId: string | undefined) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id

  return useQuery({
    queryKey: ['contact', tenantId, contactId],
    queryFn: () => apiClient<Contact>(`/tenants/${tenantId}/contacts/${contactId}`, { getToken }),
    enabled: !!tenantId && !!contactId,
  })
}

export function useContactMessages(contactId: string | undefined, page = 1) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id

  return useQuery({
    queryKey: ['contact-messages', tenantId, contactId, page],
    queryFn: () => apiClient<PaginatedResponse<Message>>(`/tenants/${tenantId}/contacts/${contactId}/messages?page=${page}`, { getToken }),
    enabled: !!tenantId && !!contactId,
  })
}
