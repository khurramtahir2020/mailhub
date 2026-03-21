import { useState } from 'react'
import { useAdminTenant, useAdminActions } from '../../hooks/use-admin'

function modeBadge(mode: string) {
  if (mode === 'production') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        production
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
      sandbox
    </span>
  )
}

function statusBadge(status: string) {
  if (status === 'suspended') {
    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
        suspended
      </span>
    )
  }
  return (
    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
      {status}
    </span>
  )
}

export function TenantDetail({ tenantId, onBack }: { tenantId: string; onBack: () => void }) {
  const { data: tenant, isLoading } = useAdminTenant(tenantId)
  const { suspend, unsuspend, promote } = useAdminActions()

  const [showSuspendInput, setShowSuspendInput] = useState(false)
  const [suspendReason, setSuspendReason] = useState('')

  if (isLoading) {
    return (
      <div className="space-y-8">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back to tenants
        </button>
        <p className="text-[13px] text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="space-y-8">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back to tenants
        </button>
        <p className="text-[13px] text-muted-foreground">Tenant not found.</p>
      </div>
    )
  }

  const resourceStats = [
    { label: 'Domains', value: tenant.domainCount, color: 'from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]' },
    { label: 'Contacts', value: tenant.contactCount, color: 'from-emerald-500 to-emerald-400' },
    { label: 'Messages', value: tenant.messageCount, color: 'from-amber-500 to-orange-400' },
    { label: 'Emails Sent', value: tenant.emailsSent, color: 'from-red-500 to-rose-400' },
  ]

  const infoRows = [
    { label: 'Slug', value: tenant.slug },
    { label: 'Owner', value: tenant.ownerEmail },
    { label: 'Mode', value: tenant.mode },
    { label: 'Status', value: tenant.status },
    { label: 'Daily Send Limit', value: tenant.dailySendLimit.toLocaleString() },
    { label: 'Created', value: new Date(tenant.createdAt).toLocaleDateString() },
    ...(tenant.suspendedAt
      ? [
          { label: 'Suspended At', value: new Date(tenant.suspendedAt).toLocaleString() },
          { label: 'Suspension Reason', value: tenant.suspensionReason || 'N/A' },
        ]
      : []),
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
          Back
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">{tenant.name}</h1>
        {modeBadge(tenant.mode)}
        {statusBadge(tenant.status)}
      </div>

      {/* Resource stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {resourceStats.map((stat) => (
          <div key={stat.label} className="stagger-item glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.color}`} />
              <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stat.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Tenant info */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Tenant Info</span>
        </div>
        <div className="divide-y divide-border/30">
          {infoRows.map((row) => (
            <div key={row.label} className="stagger-item flex items-center justify-between py-3 px-1">
              <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{row.label}</span>
              <span className="text-[13px] font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Actions</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {tenant.mode === 'sandbox' && (
            <button
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              onClick={() => promote.mutate({ tenantId: tenant.id })}
              disabled={promote.isPending}
            >
              {promote.isPending ? 'Promoting...' : 'Promote to Production'}
            </button>
          )}

          {tenant.status === 'active' && (
            <>
              {showSuspendInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Suspension reason..."
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    className="text-[12px] px-2 py-1.5 rounded-md border border-border/50 bg-secondary/50 w-56 focus:outline-none focus:border-primary/50"
                  />
                  <button
                    className="text-[11px] text-red-600 hover:text-red-500 font-medium"
                    onClick={() => {
                      if (suspendReason.trim()) {
                        suspend.mutate({ tenantId: tenant.id, reason: suspendReason.trim() })
                        setShowSuspendInput(false)
                        setSuspendReason('')
                      }
                    }}
                    disabled={suspend.isPending}
                  >
                    {suspend.isPending ? 'Suspending...' : 'Confirm Suspend'}
                  </button>
                  <button
                    className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                    onClick={() => {
                      setShowSuspendInput(false)
                      setSuspendReason('')
                    }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className="text-[11px] text-red-600 hover:text-red-500 font-medium"
                  onClick={() => setShowSuspendInput(true)}
                >
                  Suspend Tenant
                </button>
              )}
            </>
          )}

          {tenant.status === 'suspended' && (
            <button
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
              onClick={() => unsuspend.mutate(tenant.id)}
              disabled={unsuspend.isPending}
            >
              {unsuspend.isPending ? 'Unsuspending...' : 'Unsuspend Tenant'}
            </button>
          )}
        </div>
      </div>

      {/* Usage (last 30 days) */}
      {tenant.usage && tenant.usage.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
            <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Usage (Last 30 Days)</span>
          </div>
          <div className="divide-y divide-border/30">
            {tenant.usage.map((entry: any, i: number) => (
              <div key={i} className="stagger-item flex items-center justify-between py-3 px-1">
                <span className="text-[13px] text-muted-foreground">{entry.date || entry.period}</span>
                <div className="flex items-center gap-4 text-[12px]">
                  <span>Sent: <span className="font-medium text-foreground">{entry.sent ?? entry.emailsSent ?? 0}</span></span>
                  <span>Delivered: <span className="font-medium text-foreground">{entry.delivered ?? entry.emailsDelivered ?? 0}</span></span>
                  <span>Bounced: <span className="font-medium text-foreground">{entry.bounced ?? entry.emailsBounced ?? 0}</span></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
