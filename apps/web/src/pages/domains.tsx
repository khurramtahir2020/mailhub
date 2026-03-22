import { useState } from 'react'
import { useDomains } from '../hooks/use-domains'
import { useSenders } from '../hooks/use-senders'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast } from 'sonner'
import { ListSkeleton } from '../components/ui/skeleton'
import { EmptyState } from '../components/ui/empty-state'
import { Globe, Copy, Shield, Mail, Trash2, RefreshCw, ChevronRight } from 'lucide-react'
import type { Domain } from '@mailhub/shared'

function statusBadge(status: Domain['status']) {
  const styles = {
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse',
    failed: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${styles[status]}`}>
      {status}
    </span>
  )
}

type DomainTab = 'overview' | 'dns' | 'senders'

function DomainCard({
  domain,
  senders,
  onVerify,
  onDelete,
  onAddSender,
  onDeleteSender,
  verifyPending,
  deletePending,
  addSenderPending,
}: {
  domain: Domain
  senders: any[]
  onVerify: () => void
  onDelete: () => void
  onAddSender: (email: string, name?: string) => void
  onDeleteSender: (id: string) => void
  verifyPending: boolean
  deletePending: boolean
  addSenderPending: boolean
}) {
  const [activeTab, setActiveTab] = useState<DomainTab>('overview')
  const [senderEmail, setSenderEmail] = useState('')
  const [senderName, setSenderName] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const dns = domain.dnsRecords as {
    dkim?: { name: string; type: string; value: string }[]
    spf?: { name: string; type: string; value: string }
    dmarc?: { name: string; type: string; value: string }
  } | null

  const allRecords: { name: string; type: string; value: string; label: string; category: string }[] = []
  if (dns?.dkim) {
    dns.dkim.forEach((r, i) => allRecords.push({ ...r, label: `DKIM ${i + 1}`, category: 'DKIM' }))
  }
  if (dns?.spf) allRecords.push({ ...dns.spf, label: 'SPF', category: 'SPF' })
  if (dns?.dmarc) allRecords.push({ ...dns.dmarc, label: 'DMARC', category: 'DMARC' })

  const tabs = [
    { id: 'overview' as const, label: 'Overview', count: null },
    { id: 'dns' as const, label: 'DNS Records', count: allRecords.length },
    { id: 'senders' as const, label: 'Senders', count: senders.length },
  ]

  const handleAddSender = () => {
    if (!senderEmail.trim()) return
    onAddSender(senderEmail.trim(), senderName.trim() || undefined)
    setSenderEmail('')
    setSenderName('')
  }

  const copyToClipboard = (value: string, label: string) => {
    navigator.clipboard.writeText(value)
    toast(`${label} copied`)
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
            domain.status === 'verified'
              ? 'bg-emerald-50 text-emerald-600'
              : domain.status === 'pending'
              ? 'bg-amber-50 text-amber-600'
              : 'bg-red-50 text-red-600'
          }`}>
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-semibold tracking-tight">{domain.domain}</span>
              {statusBadge(domain.status)}
            </div>
            <div className="flex items-center gap-4 mt-0.5">
              <span className={`flex items-center gap-1.5 text-[11px] ${domain.dkimVerified ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${domain.dkimVerified ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                DKIM
              </span>
              <span className={`flex items-center gap-1.5 text-[11px] ${domain.spfVerified ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${domain.spfVerified ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                SPF
              </span>
              <span className={`flex items-center gap-1.5 text-[11px] ${domain.dmarcVerified ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${domain.dmarcVerified ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                DMARC
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors press-effect"
            onClick={onVerify}
            disabled={verifyPending}
          >
            <RefreshCw className={`w-3 h-3 ${verifyPending ? 'animate-spin' : ''}`} />
            Verify
          </button>
          {showDeleteConfirm ? (
            <div className="flex items-center gap-1.5">
              <button
                className="text-[11px] font-medium text-red-600 hover:text-red-500 px-2 py-1.5"
                onClick={onDelete}
                disabled={deletePending}
              >
                Confirm
              </button>
              <button
                className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1.5"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-600 px-2 py-1.5 transition-colors"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border/30 px-6 flex gap-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-[12px] font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0 rounded-full ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {tab.count}
                </span>
              )}
            </span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-4 right-4 h-[2px] bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="border-t border-border/30 p-6 animate-fade-in" key={activeTab}>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Status</span>
                <div className="mt-1.5 flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${domain.status === 'verified' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                  <span className="text-[13px] font-medium capitalize">{domain.status}</span>
                </div>
              </div>
              {domain.dmarcPolicy && (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">DMARC Policy</span>
                  <p className="mt-1.5 text-[13px] font-medium">p={domain.dmarcPolicy}</p>
                  {domain.dmarcPolicy === 'none' && (
                    <p className="text-[11px] text-amber-600 mt-0.5">Consider upgrading to p=quarantine for better protection</p>
                  )}
                </div>
              )}
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Senders</span>
                <p className="mt-1.5 text-[13px]">{senders.length} sender{senders.length !== 1 ? 's' : ''} configured</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Created</span>
                <p className="mt-1.5 text-[13px]">{new Date(domain.createdAt).toLocaleDateString()}</p>
              </div>
              {domain.verifiedAt && (
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Verified</span>
                  <p className="mt-1.5 text-[13px]">{new Date(domain.verifiedAt).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Authentication</span>
                <div className="mt-1.5 space-y-1">
                  {['DKIM', 'SPF', 'DMARC'].map((check) => {
                    const verified = check === 'DKIM' ? domain.dkimVerified : check === 'SPF' ? domain.spfVerified : domain.dmarcVerified
                    return (
                      <div key={check} className="flex items-center gap-2">
                        <span className={`text-[12px] ${verified ? 'text-emerald-600' : 'text-red-500'}`}>
                          {verified ? '✓' : '✗'}
                        </span>
                        <span className="text-[12px]">{check}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'dns' && (
          <div className="space-y-2">
            {allRecords.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-4 text-center">No DNS records available. Try clicking Verify.</p>
            ) : (
              <>
                <p className="text-[12px] text-muted-foreground mb-4">
                  Add these records at your DNS provider. Click to copy individual values.
                </p>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border/30">
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Type</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Name</th>
                        <th className="px-4 py-2.5 text-left font-medium text-muted-foreground uppercase tracking-wider text-[10px]">Value</th>
                        <th className="px-4 py-2.5 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {allRecords.map((record, i) => (
                        <tr key={i} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3">
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
                              {record.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="font-mono text-[11px] text-foreground break-all">{record.name}</code>
                          </td>
                          <td className="px-4 py-3 max-w-[300px]">
                            <code className="font-mono text-[11px] text-muted-foreground break-all">{record.value}</code>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-all press-effect"
                              onClick={() => copyToClipboard(record.value, record.label)}
                            >
                              <Copy className="w-3 h-3" />
                              Copy
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'senders' && (
          <div className="space-y-4">
            {domain.status !== 'verified' ? (
              <div className="py-6 text-center">
                <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-[13px] text-muted-foreground">Verify your domain first to add senders.</p>
              </div>
            ) : (
              <>
                {/* Add sender form */}
                <div className="flex gap-3">
                  <Input
                    placeholder={`sender@${domain.domain}`}
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSender()}
                    className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
                  />
                  <Input
                    placeholder="Display name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)] max-w-[200px]"
                  />
                  <Button
                    className="press-effect shrink-0"
                    onClick={handleAddSender}
                    disabled={addSenderPending || !senderEmail.trim()}
                    size="sm"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Add
                  </Button>
                </div>

                {/* Sender list */}
                {senders.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-[13px] text-muted-foreground">No senders yet. Add one above.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {senders.map((sender) => (
                      <div key={sender.id} className="stagger-item flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/5 flex items-center justify-center">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <span className="text-[13px] font-medium">{sender.email}</span>
                            {sender.name && (
                              <p className="text-[11px] text-muted-foreground">{sender.name}</p>
                            )}
                          </div>
                        </div>
                        <button
                          className="text-[11px] text-muted-foreground hover:text-red-600 transition-colors"
                          onClick={() => onDeleteSender(sender.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function DomainsPage() {
  const { domains, isLoading, add, verify, remove } = useDomains()
  const { senders, add: addSender, remove: removeSender } = useSenders()
  const [domainInput, setDomainInput] = useState('')

  const handleAddDomain = () => {
    if (!domainInput.trim()) return
    add.mutate(domainInput.trim(), {
      onSuccess: () => {
        setDomainInput('')
        toast.success('Domain added')
      },
    })
  }

  return (
    <div className="space-y-6">
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
              placeholder="e.g., notifications.example.com"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              className="bg-secondary/50 border-border/50 focus:border-[hsl(250,90%,65%/0.5)] focus:ring-1 focus:ring-[hsl(250,90%,65%/0.2)]"
            />
          </div>
          <Button className="press-effect" onClick={handleAddDomain} disabled={add.isPending || !domainInput.trim()}>
            <Globe className="w-4 h-4 mr-1.5" />
            Add Domain
          </Button>
        </div>
      </div>

      {/* Domain list */}
      {isLoading ? (
        <ListSkeleton />
      ) : domains.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No domains yet"
          description="Add a sending domain above to start delivering emails. You'll need to verify DNS records before sending."
        />
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              senders={senders.filter((s) => s.domainId === domain.id)}
              onVerify={() => verify.mutate(domain.id, { onSuccess: () => toast.success('Verification triggered') })}
              onDelete={() => remove.mutate(domain.id, { onSuccess: () => toast.success('Domain deleted') })}
              onAddSender={(email, name) => addSender.mutate({ email, name }, { onSuccess: () => toast.success('Sender added') })}
              onDeleteSender={(id) => removeSender.mutate(id, { onSuccess: () => toast.success('Sender deleted') })}
              verifyPending={verify.isPending}
              deletePending={remove.isPending}
              addSenderPending={addSender.isPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
