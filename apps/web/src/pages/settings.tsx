import { useState, useEffect } from 'react'
import { useSession } from '../hooks/use-session'
import { useTenants } from '../hooks/use-tenants'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'

export function SettingsPage() {
  const { activeTenant } = useSession()
  const { update } = useTenants()
  const [name, setName] = useState(activeTenant?.name || '')

  useEffect(() => {
    setName(activeTenant?.name || '')
  }, [activeTenant?.id])

  const handleSave = () => {
    if (!name.trim()) return
    update.mutate({ name: name.trim() })
  }

  if (!activeTenant) return null

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Workspace</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tenant-name">Workspace name</Label>
            <div className="flex gap-3">
              <Input
                id="tenant-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Button onClick={handleSave} disabled={update.isPending}>
                Save
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{activeTenant.status}</Badge>
              <Badge variant="outline">{activeTenant.mode}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Slug</Label>
            <p className="text-sm text-muted-foreground">{activeTenant.slug}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
