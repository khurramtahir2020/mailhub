import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from './use-session'
import { apiClient } from '../api/client'
import type { Template, TemplateVersion } from '@mailhub/shared'

export function useTemplates() {
  const { activeTenant, getToken } = useSession()
  const queryClient = useQueryClient()
  const tenantId = activeTenant?.id

  const query = useQuery({
    queryKey: ['templates', tenantId],
    queryFn: () => apiClient<Template[]>(`/tenants/${tenantId}/templates`, { getToken }),
    enabled: !!tenantId,
  })

  const create = useMutation({
    mutationFn: (data: { name: string; description?: string; subject: string; html_body?: string; text_body?: string; variables?: string[] }) =>
      apiClient<Template>(`/tenants/${tenantId}/templates`, {
        method: 'POST',
        body: JSON.stringify(data),
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates', tenantId] }),
  })

  const remove = useMutation({
    mutationFn: (templateId: string) =>
      apiClient(`/tenants/${tenantId}/templates/${templateId}`, {
        method: 'DELETE',
        getToken,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates', tenantId] }),
  })

  return { templates: query.data ?? [], isLoading: query.isLoading, create, remove }
}

export function useTemplate(templateId: string | undefined) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id

  return useQuery({
    queryKey: ['template', tenantId, templateId],
    queryFn: () => apiClient<Template & { version: TemplateVersion }>(`/tenants/${tenantId}/templates/${templateId}`, { getToken }),
    enabled: !!tenantId && !!templateId,
  })
}

export function useTemplateVersions(templateId: string | undefined) {
  const { activeTenant, getToken } = useSession()
  const tenantId = activeTenant?.id

  return useQuery({
    queryKey: ['template-versions', tenantId, templateId],
    queryFn: () => apiClient<TemplateVersion[]>(`/tenants/${tenantId}/templates/${templateId}/versions`, { getToken }),
    enabled: !!tenantId && !!templateId,
  })
}

export function useUpdateTemplate(templateId: string | undefined) {
  const { activeTenant, getToken } = useSession()
  const queryClient = useQueryClient()
  const tenantId = activeTenant?.id

  return useMutation({
    mutationFn: (data: { subject: string; html_body?: string; text_body?: string; variables?: string[] }) =>
      apiClient(`/tenants/${tenantId}/templates/${templateId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        getToken,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', tenantId, templateId] })
      queryClient.invalidateQueries({ queryKey: ['template-versions', tenantId, templateId] })
      queryClient.invalidateQueries({ queryKey: ['templates', tenantId] })
    },
  })
}
