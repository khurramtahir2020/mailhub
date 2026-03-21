export interface Template {
  id: string
  tenantId: string
  name: string
  description: string | null
  currentVersion: number
  createdAt: string
  updatedAt: string
}

export interface TemplateVersion {
  id: string
  templateId: string
  version: number
  subject: string
  htmlBody: string | null
  textBody: string | null
  variables: string[] | null
  createdAt: string
}
