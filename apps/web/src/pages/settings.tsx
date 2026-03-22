import { useState, useEffect } from 'react'
import { useSession } from '../hooks/use-session'
import { useTenants } from '../hooks/use-tenants'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast } from 'sonner'

export function SettingsPage() {
  const { activeTenant } = useSession()
  const { update } = useTenants()
  const [name, setName] = useState(activeTenant?.name || '')

  useEffect(() => {
    setName(activeTenant?.name || '')
  }, [activeTenant?.id])

  const handleSave = () => {
    if (!name.trim()) return
    update.mutate({ name: name.trim() }, {
      onSuccess: () => toast.success('Workspace updated'),
    })
  }

  if (!activeTenant) return null

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage your workspace configuration
        </p>
      </div>

      {/* Workspace settings */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Workspace</span>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="tenant-name" className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
              Workspace name
            </Label>
            <div className="flex gap-3">
              <Input
                id="tenant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
              />
              <Button className="press-effect" onClick={handleSave} disabled={update.isPending}>
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Status</Label>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {activeTenant.status}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                {activeTenant.mode}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Slug</Label>
            <p className="text-[13px] text-muted-foreground font-mono">{activeTenant.slug}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
