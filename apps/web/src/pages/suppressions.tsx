import { useState } from 'react'
import { useSuppressions } from '../hooks/use-suppressions'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Suppressions</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Suppression</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="suppress-email" className="sr-only">Email</Label>
              <Input
                id="suppress-email"
                placeholder="e.g., user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <Button onClick={handleAdd} disabled={add.isPending || !email.trim()}>
              Suppress
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suppression List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !suppressions || suppressions.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No suppressions. Emails are automatically suppressed on hard bounces and complaints.
            </p>
          ) : (
            <div className="space-y-3">
              {suppressions.data.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-md border p-3">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">{s.email}</span>
                    <p className="text-xs text-muted-foreground">
                      {s.reason} | {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => remove.mutate(s.id)}
                    disabled={remove.isPending}
                  >
                    Delete
                  </Button>
                </div>
              ))}

              {suppressions.pages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {suppressions.page} of {suppressions.pages} ({suppressions.total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= suppressions.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
