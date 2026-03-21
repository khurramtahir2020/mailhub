import { useState } from 'react'
import { useDomains } from '../hooks/use-domains'
import { useSenders } from '../hooks/use-senders'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import type { Domain } from '@mailhub/shared'

function statusBadge(status: Domain['status']) {
  switch (status) {
    case 'verified':
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          verified
        </span>
      )
    case 'pending':
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          pending
        </span>
      )
    case 'failed':
      return (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
          failed
        </span>
      )
  }
}

function DnsCheckItem({ label, verified }: { label: string; verified: boolean }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <div className={`w-2 h-2 rounded-full ${verified ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-zinc-600 to-zinc-500'}`} />
      <span className={verified ? 'text-emerald-600' : 'text-muted-foreground'}>{label}</span>
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
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Domains</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Configure sending domains and DNS authentication
        </p>
      </div>

      {/* Add domain */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Add Domain</span>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <Label htmlFor="domain-name" className="sr-only">Domain</Label>
            <Input
              id="domain-name"
              placeholder="e.g., example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
            />
          </div>
          <Button onClick={handleAddDomain} disabled={add.isPending || !domainInput.trim()}>
            Add Domain
          </Button>
        </div>
      </div>

      {/* Domain list */}
      {isLoading ? (
        <p className="text-[13px] text-muted-foreground">Loading...</p>
      ) : domains.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <p className="text-muted-foreground text-[13px]">No domains yet.</p>
          <p className="text-muted-foreground/60 text-[12px] mt-1">Add a domain above to start sending emails.</p>
        </div>
      ) : (
        domains.map((domain) => {
          const domainSenders = senders.filter((s) => s.domainId === domain.id)
          const dns = domain.dnsRecords as {
            dkim?: { name: string; type: string; value: string }[]
            spf?: { name: string; type: string; value: string }
            dmarc?: { name: string; type: string; value: string }
          } | null

          const allRecords: { name: string; type: string; value: string; label: string }[] = []
          if (dns?.dkim) {
            dns.dkim.forEach((r, i) => allRecords.push({ ...r, label: `DKIM ${i + 1}` }))
          }
          if (dns?.spf) {
            allRecords.push({ ...dns.spf, label: 'SPF' })
          }
          if (dns?.dmarc) {
            allRecords.push({ ...dns.dmarc, label: 'DMARC' })
          }

          return (
            <div key={domain.id} className="glass-card rounded-xl p-5 transition-all duration-200 hover:translate-y-[-2px]">
              {/* Domain header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-[15px] font-semibold tracking-tight">{domain.domain}</span>
                  {statusBadge(domain.status)}
                </div>
                <div className="flex gap-2">
                  <button
                    className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                    onClick={() => verify.mutate(domain.id)}
                    disabled={verify.isPending}
                  >
                    Verify
                  </button>
                  <button
                    className="text-[11px] text-red-600 hover:text-red-500 px-2 py-1.5 transition-colors"
                    onClick={() => remove.mutate(domain.id)}
                    disabled={remove.isPending}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* DNS check indicators */}
              <div className="flex gap-6 mb-4">
                <DnsCheckItem label="DKIM" verified={domain.dkimVerified} />
                <DnsCheckItem label="SPF" verified={domain.spfVerified} />
                <DnsCheckItem label="DMARC" verified={domain.dmarcVerified} />
              </div>

              {/* DNS records */}
              {allRecords.length > 0 && (
                <div className="border-t border-border/30 pt-4 mt-4 space-y-3">
                  <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">DNS Records</span>
                  {allRecords.map((record, i) => (
                    <div key={i} className="rounded-lg bg-muted/50 border border-border/30 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/20">
                            {record.type}
                          </span>
                          <span className="text-[12px] font-medium">{record.label}</span>
                        </div>
                        <button
                          className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                          onClick={() => navigator.clipboard.writeText(record.value)}
                        >
                          Copy Value
                        </button>
                      </div>
                      <p className="text-[12px] text-muted-foreground">
                        Name: <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{record.name}</code>
                      </p>
                      <p className="text-[12px] text-muted-foreground break-all">
                        Value: <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{record.value}</code>
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Senders */}
              {domain.status === 'verified' && (
                <div className="border-t border-border/30 pt-4 mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Senders</span>
                    <button
                      className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                      onClick={() => setAddingSenderForDomain(
                        addingSenderForDomain === domain.id ? null : domain.id
                      )}
                    >
                      {addingSenderForDomain === domain.id ? 'Cancel' : 'Add Sender'}
                    </button>
                  </div>

                  {addingSenderForDomain === domain.id && (
                    <div className="flex gap-3">
                      <Input
                        placeholder="sender@example.com"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
                      />
                      <Input
                        placeholder="Display name (optional)"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
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
                    <p className="text-[13px] text-muted-foreground">No senders for this domain.</p>
                  ) : (
                    <div className="divide-y divide-border/30">
                      {domainSenders.map((sender) => (
                        <div key={sender.id} className="stagger-item flex items-center justify-between py-3 px-1">
                          <div className="space-y-0.5">
                            <span className="text-[13px] font-medium">{sender.email}</span>
                            {sender.name && (
                              <p className="text-[12px] text-muted-foreground">{sender.name}</p>
                            )}
                          </div>
                          <button
                            className="text-[11px] text-red-600 hover:text-red-500 transition-colors"
                            onClick={() => removeSender.mutate(sender.id)}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
