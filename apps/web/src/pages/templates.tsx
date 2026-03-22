import { useState } from 'react'
import { useTemplates, useTemplate, useUpdateTemplate } from '../hooks/use-templates'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast } from 'sonner'
import { ListSkeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import { FileText } from 'lucide-react'

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
          toast.success('Template created')
        },
      }
    )
  }

  if (selectedId) {
    return <TemplateDetail templateId={selectedId} onBack={() => setSelectedId(null)} />
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Templates</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Create and manage email templates with versioning
          </p>
        </div>
        <Button className="press-effect" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancel' : 'New Template'}
        </Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Create Template</span>
          </div>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tpl-name" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Name</Label>
                <Input
                  id="tpl-name"
                  placeholder="e.g., Welcome Email"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tpl-desc" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Description</Label>
                <Input
                  id="tpl-desc"
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-subject" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Subject</Label>
              <Input
                id="tpl-subject"
                placeholder="Email subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-html" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">HTML Body</Label>
              <textarea
                id="tpl-html"
                className="flex min-h-[120px] w-full rounded-lg border bg-secondary/50 border-border/50 px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)] focus:outline-none"
                placeholder="<html>...</html>"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpl-text" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Text Body</Label>
              <textarea
                id="tpl-text"
                className="flex min-h-[80px] w-full rounded-lg border bg-secondary/50 border-border/50 px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)] focus:outline-none"
                placeholder="Plain text version..."
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
              />
            </div>
            <Button className="press-effect" onClick={handleCreate} disabled={create.isPending || !name.trim() || !subject.trim()}>
              Create Template
            </Button>
          </div>
        </div>
      )}

      {/* Template list */}
      {isLoading ? (
        <ListSkeleton />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create a template to get started with reusable email content."
        />
      ) : (
        <div className="glass-card rounded-xl p-5">
          <div className="divide-y divide-border/30">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="stagger-item flex items-center justify-between py-3 px-1 cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
                onClick={() => setSelectedId(tpl.id)}
              >
                <div className="space-y-0.5">
                  <p className="text-[13px] font-medium">{tpl.name}</p>
                  {tpl.description && (
                    <p className="text-[12px] text-muted-foreground">{tpl.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
                    v{tpl.currentVersion}
                  </span>
                  <button
                    className="text-[11px] text-red-600 hover:text-red-500 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      remove.mutate(tpl.id, {
                        onSuccess: () => toast.success('Template deleted'),
                      })
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
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
        onSuccess: () => {
          setEditing(false)
          toast.success('Template updated')
        },
      }
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back to templates
        </button>
        <ListSkeleton rows={3} />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="space-y-8">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back to templates
        </button>
        <p className="text-[13px] text-muted-foreground">Template not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">{template.name}</h1>
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
          v{template.currentVersion}
        </span>
      </div>

      {template.description && (
        <p className="text-[13px] text-muted-foreground">{template.description}</p>
      )}

      {editing ? (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">New Version</span>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-subject" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Subject</Label>
              <Input
                id="edit-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-html" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">HTML Body</Label>
              <textarea
                id="edit-html"
                className="flex min-h-[120px] w-full rounded-lg border bg-secondary/50 border-border/50 px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)] focus:outline-none"
                value={htmlBody}
                onChange={(e) => setHtmlBody(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-text" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Text Body</Label>
              <textarea
                id="edit-text"
                className="flex min-h-[80px] w-full rounded-lg border bg-secondary/50 border-border/50 px-3 py-2 text-[13px] placeholder:text-muted-foreground focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)] focus:outline-none"
                value={textBody}
                onChange={(e) => setTextBody(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button className="press-effect" onClick={handleUpdate} disabled={update.isPending || !subject.trim()}>
                Save New Version
              </Button>
              <button
                className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                onClick={() => setEditing(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
              <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Current Version</span>
            </div>
            <button
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              onClick={startEdit}
            >
              Edit / New Version
            </button>
          </div>

          {template.version ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Subject</span>
                <p className="text-[13px]">{template.version.subject}</p>
              </div>
              {template.version.htmlBody && (
                <>
                  <div className="border-t border-border/30" />
                  <div className="space-y-1">
                    <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">HTML Body</span>
                    <pre className="rounded-lg bg-muted/50 border border-border/30 p-3 font-mono text-[12px] overflow-auto max-h-64">
                      {template.version.htmlBody}
                    </pre>
                  </div>
                </>
              )}
              {template.version.textBody && (
                <>
                  <div className="border-t border-border/30" />
                  <div className="space-y-1">
                    <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Text Body</span>
                    <pre className="rounded-lg bg-muted/50 border border-border/30 p-3 font-mono text-[12px] overflow-auto max-h-64">
                      {template.version.textBody}
                    </pre>
                  </div>
                </>
              )}
              {template.version.variables && template.version.variables.length > 0 && (
                <>
                  <div className="border-t border-border/30" />
                  <div className="space-y-2">
                    <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Variables</span>
                    <div className="flex gap-2 flex-wrap">
                      {template.version.variables.map((v) => (
                        <span key={v} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50 font-mono">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground">No version content available.</p>
          )}
        </div>
      )}
    </div>
  )
}
