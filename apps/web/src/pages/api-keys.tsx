import { useState } from 'react'
import { useApiKeys } from '../hooks/use-api-keys'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'

export function ApiKeysPage() {
  const { keys, isLoading, create, revoke } = useApiKeys()
  const [name, setName] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)

  const handleCreate = () => {
    if (!name.trim()) return
    create.mutate({ name: name.trim() }, {
      onSuccess: (data) => {
        setNewKey(data.key)
        setName('')
      },
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="key-name" className="sr-only">Key name</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <Button onClick={handleCreate} disabled={create.isPending || !name.trim()}>
              Create
            </Button>
          </div>

          {newKey && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
              <p className="mb-2 text-sm font-medium text-amber-800 dark:text-amber-200">
                Copy this key now. It won't be shown again.
              </p>
              <code className="block break-all rounded bg-white p-2 text-sm dark:bg-black">
                {newKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => navigator.clipboard.writeText(newKey)}
              >
                Copy to clipboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys yet. Create one above.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{key.name}</span>
                      <Badge variant={key.isRevoked ? 'destructive' : 'secondary'} className="text-xs">
                        {key.isRevoked ? 'Revoked' : key.scope}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground">{key.keyPrefix}...</code>
                  </div>
                  {!key.isRevoked && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => revoke.mutate(key.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
