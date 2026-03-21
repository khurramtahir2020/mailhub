import { useState } from 'react'
import { useTemplates, useTemplate, useUpdateTemplate } from '../hooks/use-templates'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'

export function TemplatesPage() {
  const { templates, isLoading, create, remove } = useTemplates()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  // Create form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [textBody, setTextBody] = useState('')

  const handleCreate = () => {
    if (!name.trim() || !subject.trim()) return
    create.mutate(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        subject: subject.trim(),
        html_body: htmlBody.trim() || undefined,
        text_body: textBody.trim() || undefined,
      },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
          setSubject('')
          setHtmlBody('')
          setTextBody('')
          setShowCreate(false)
        },
      }
    )
  }

  if (selectedId) {
    return <TemplateDetail templateId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
        <Button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'New Template'}
        </Button>
      </div>

      {showCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-name">Name</Label>
                <Input
                  id="tpl-name"
                  placeholder="e.g., Welcome Email"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-desc">Description</Label>
                <Input
                  id="tpl-desc"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-subject">Subject</Label>
              <Input
                id="tpl-subject"
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-html">HTML Body</Label>
              <textarea
                id="tpl-html"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="<html>...</html>"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-text">Text Body</Label>
              <textarea
                id="tpl-text"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Plain text version..."
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={create.isPending || !name.trim() || !subject.trim()}>
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              No templates yet. Create one to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((tpl) => (
            <Card
              key={tpl.id}
              className="cursor-pointer hover:bg-accent/30 transition-colors"
              onClick={() => setSelectedId(tpl.id)}
            >
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{tpl.name}</p>
                  {tpl.description && (
                    <p className="text-xs text-muted-foreground">{tpl.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">v{tpl.currentVersion}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove.mutate(tpl.id)
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateDetail({ templateId, onBack }: { templateId: string; onBack: () => void }) {
  const { data: template, isLoading } = useTemplate(templateId)
  const update = useUpdateTemplate(templateId)
  const [editing, setEditing] = useState(false)
  const [subject, setSubject] = useState('')
  const [htmlBody, setHtmlBody] = useState('')
  const [textBody, setTextBody] = useState('')

  const startEdit = () => {
    if (!template) return
    setSubject(template.version?.subject ?? '')
    setHtmlBody(template.version?.htmlBody ?? '')
    setTextBody(template.version?.textBody ?? '')
    setEditing(true)
  }

  const handleUpdate = () => {
    if (!subject.trim()) return
    update.mutate(
      {
        subject: subject.trim(),
        html_body: htmlBody.trim() || undefined,
        text_body: textBody.trim() || undefined,
      },
      {
        onSuccess: () => setEditing(false),
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>Back to templates</Button>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!template) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={onBack}>Back to templates</Button>
        <p className="text-sm text-muted-foreground">Template not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
        <Badge variant="secondary">v{template.currentVersion}</Badge>
      </div>

      {template.description && (
        <p className="text-sm text-muted-foreground">{template.description}</p>
      )}

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-html">HTML Body</Label>
              <textarea
                id="edit-html"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-text">Text Body</Label>
              <textarea
                id="edit-text"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleUpdate} disabled={update.isPending || !subject.trim()}>
                Save New Version
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Current Version</CardTitle>
                <Button variant="outline" size="sm" onClick={startEdit}>
                  Edit / New Version
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {template.version ? (
                <>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Subject</p>
                    <p className="text-sm">{template.version.subject}</p>
                  </div>
                  {template.version.htmlBody && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">HTML Body</p>
                        <pre className="rounded-md border bg-muted/50 p-3 text-xs overflow-auto max-h-64">
                          {template.version.htmlBody}
                        </pre>
                      </div>
                    </>
                  )}
                  {template.version.textBody && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Text Body</p>
                        <pre className="rounded-md border bg-muted/50 p-3 text-xs overflow-auto max-h-64">
                          {template.version.textBody}
                        </pre>
                      </div>
                    </>
                  )}
                  {template.version.variables && template.version.variables.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Variables</p>
                        <div className="flex gap-2 flex-wrap">
                          {template.version.variables.map((v) => (
                            <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No version content available.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
