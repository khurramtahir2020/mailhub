import { useState } from 'react'
import { useDomains } from '../hooks/use-domains'
import { useSenders } from '../hooks/use-senders'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Badge } from '../components/ui/badge'
import { Separator } from '../components/ui/separator'
import type { Domain } from '@mailhub/shared'

const statusColor = (status: Domain['status']) => {
  switch (status) {
    case 'verified': return 'default' as const
    case 'pending': return 'secondary' as const
    case 'failed': return 'destructive' as const
  }
}

function DnsCheckItem({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={verified ? 'text-green-600' : 'text-muted-foreground'}>
        {verified ? '✓' : '○'}
      </span>
      <span>{label}</span>
    </div>
  )
}

export function DomainsPage() {
  const { domains, isLoading, add, verify, remove } = useDomains()
  const { senders, add: addSender, remove: removeSender } = useSenders()
  const [domainInput, setDomainInput] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [addingSenderForDomain, setAddingSenderForDomain] = useState<string | null>(null)

  const handleAddDomain = () => {
    if (!domainInput.trim()) return
    add.mutate(domainInput.trim(), {
      onSuccess: () => setDomainInput(''),
    })
  }

  const handleAddSender = (domainId: string) => {
    if (!senderEmail.trim()) return
    addSender.mutate(
      { email: senderEmail.trim(), name: senderName.trim() || undefined },
      {
        onSuccess: () => {
          setSenderEmail('')
          setSenderName('')
          setAddingSenderForDomain(null)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Domains</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Domain</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="domain-name" className="sr-only">Domain</Label>
              <Input
                id="domain-name"
                placeholder="e.g., example.com"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              />
            </div>
            <Button onClick={handleAddDomain} disabled={add.isPending || !domainInput.trim()}>
              Add Domain
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : domains.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-muted-foreground text-center">
              No domains yet. Add a domain above to start sending emails.
            </p>
          </CardContent>
        </Card>
      ) : (
        domains.map((domain) => {
          const domainSenders = senders.filter((s) => s.domainId === domain.id)
          const dnsRecords = domain.dnsRecords as Array<{ type: string; name: string; value: string }> | null

          return (
            <Card key={domain.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{domain.domain}</CardTitle>
                    <Badge variant={statusColor(domain.status)}>{domain.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => verify.mutate(domain.id)}
                      disabled={verify.isPending}
                    >
                      Verify
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove.mutate(domain.id)}
                      disabled={remove.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-6">
                  <DnsCheckItem label="DKIM" verified={domain.dkimVerified} />
                  <DnsCheckItem label="SPF" verified={domain.spfVerified} />
                  <DnsCheckItem label="DMARC" verified={domain.dmarcVerified} />
                </div>

                {dnsRecords && dnsRecords.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-sm font-medium">DNS Records</p>
                      {dnsRecords.map((record, i) => (
                        <div key={i} className="rounded-md border p-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">{record.type}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigator.clipboard.writeText(record.value)}
                            >
                              Copy
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">Name: <code>{record.name}</code></p>
                          <p className="text-xs text-muted-foreground break-all">Value: <code>{record.value}</code></p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {domain.status === 'verified' && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Senders</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAddingSenderForDomain(
                            addingSenderForDomain === domain.id ? null : domain.id
                          )}
                        >
                          {addingSenderForDomain === domain.id ? 'Cancel' : 'Add Sender'}
                        </Button>
                      </div>

                      {addingSenderForDomain === domain.id && (
                        <div className="flex gap-3">
                          <Input
                            placeholder="sender@example.com"
                            value={senderEmail}
                            onChange={(e) => setSenderEmail(e.target.value)}
                          />
                          <Input
                            placeholder="Display name (optional)"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                          />
                          <Button
                            onClick={() => handleAddSender(domain.id)}
                            disabled={addSender.isPending || !senderEmail.trim()}
                          >
                            Add
                          </Button>
                        </div>
                      )}

                      {domainSenders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No senders for this domain.</p>
                      ) : (
                        domainSenders.map((sender) => (
                          <div key={sender.id} className="flex items-center justify-between rounded-md border p-3">
                            <div className="space-y-1">
                              <span className="text-sm font-medium">{sender.email}</span>
                              {sender.name && (
                                <p className="text-xs text-muted-foreground">{sender.name}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeSender.mutate(sender.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
