import { useState } from 'react'
import { useApiKeys } from '../hooks/use-api-keys'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast } from 'sonner'
import { ListSkeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import { Key } from 'lucide-react'

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
        toast.success('API key created')
      },
    })
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage API keys for programmatic access to your workspace
        </p>
      </div>

      {/* Create key */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Create API Key</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="key-name" className="sr-only">Key name</Label>
            <Input
              id="key-name"
              placeholder="e.g., Production"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
            />
          </div>
          <Button className="press-effect" onClick={handleCreate} disabled={create.isPending || !name.trim()}>
            Create
          </Button>
        </div>

        {newKey && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="mb-2 text-[13px] font-medium text-amber-600">
              Copy this key now. It won't be shown again.
            </p>
            <code className="block break-all rounded-lg bg-muted p-3 font-mono text-[12px] text-foreground">
              {newKey}
            </code>
            <button
              className="mt-3 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors press-effect"
              onClick={() => {
                navigator.clipboard.writeText(newKey)
                toast('Key copied to clipboard')
              }}
            >
              Copy to clipboard
            </button>
          </div>
        )}
      </div>

      {/* Active keys */}
      {isLoading ? (
        <ListSkeleton />
      ) : keys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys yet"
          description="Create an API key above to start making programmatic requests to your workspace."
        />
      ) : (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Active Keys</span>
          </div>

          <div className="divide-y divide-border/30">
            {keys.map((key) => (
              <div key={key.id} className="stagger-item flex items-center justify-between py-3 px-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{key.name}</span>
                    {key.isRevoked ? (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                        Revoked
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/50">
                        {key.scope}
                      </span>
                    )}
                  </div>
                  <code className="font-mono text-[12px] text-muted-foreground">{key.keyPrefix}...</code>
                </div>
                {!key.isRevoked && (
                  <button
                    className="text-[11px] text-red-600 hover:text-red-500 transition-colors"
                    onClick={() => revoke.mutate(key.id, {
                      onSuccess: () => toast.success('API key revoked'),
                    })}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
