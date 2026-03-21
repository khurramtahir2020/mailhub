import { useState } from 'react'
import { useSuppressions } from '../hooks/use-suppressions'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function SuppressionsPage() {
  const [page, setPage] = useState(1)
  const { suppressions, isLoading, add, remove } = useSuppressions({ page })
  const [email, setEmail] = useState('')

  const handleAdd = () => {
    if (!email.trim()) return
    add.mutate(
      { email: email.trim() },
      { onSuccess: () => setEmail('') }
    )
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Suppressions</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage suppressed email addresses that will not receive messages
        </p>
      </div>

      {/* Add suppression */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-400" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Add Suppression</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="suppress-email" className="sr-only">Email</Label>
            <Input
              id="suppress-email"
              placeholder="e.g., user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
            />
          </div>
          <Button onClick={handleAdd} disabled={add.isPending || !email.trim()}>
            Suppress
          </Button>
        </div>
      </div>

      {/* Suppression list */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-500 to-rose-400" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Suppression List</span>
        </div>

        {isLoading ? (
          <p className="text-[13px] text-muted-foreground">Loading...</p>
        ) : !suppressions || suppressions.data.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-[13px]">No suppressions.</p>
            <p className="text-muted-foreground/60 text-[12px] mt-1">Emails are automatically suppressed on hard bounces and complaints.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border/30">
              {suppressions.data.map((s) => (
                <div key={s.id} className="stagger-item flex items-center justify-between py-3 px-1">
                  <div className="space-y-0.5">
                    <span className="text-[13px] font-medium">{s.email}</span>
                    <p className="text-[12px] text-muted-foreground">
                      {s.reason} | {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors"
                    onClick={() => remove.mutate(s.id)}
                    disabled={remove.isPending}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {suppressions.pages > 1 && (
              <div className="flex items-center justify-center gap-4 text-[13px] text-muted-foreground pt-4 border-t border-border/30 mt-4">
                <button
                  className="hover:text-foreground transition-colors disabled:opacity-40"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page <= 1}
                >
                  &larr; Previous
                </button>
                <span>Page {suppressions.page} of {suppressions.pages}</span>
                <button
                  className="hover:text-foreground transition-colors disabled:opacity-40"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= suppressions.pages}
                >
                  Next &rarr;
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
