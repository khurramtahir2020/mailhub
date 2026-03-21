import { useState } from 'react'
import { useAdminTenants, useAdminUsage, useAdminActions } from '../../hooks/use-admin'
import { TenantDetail } from './tenant-detail'

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

export function AdminTenantsPage() {
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: tenants, isLoading } = useAdminTenants(page)
  const { data: usage, isLoading: usageLoading } = useAdminUsage()
  const { suspend, unsuspend, promote } = useAdminActions()

  const [suspendingId, setSuspendingId] = useState<string | null>(null)
  const [suspendReason, setSuspendReason] = useState('')

  if (selectedId) {
    return <TenantDetail tenantId={selectedId} onBack={() => setSelectedId(null)} />
  }

  const platformStats = [
    {
      label: 'Emails Sent',
      value: usageLoading ? '...' : (usage?.emailsSent ?? 0).toLocaleString(),
      sub: 'Platform total',
      color: 'from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]',
    },
    {
      label: 'Delivered',
      value: usageLoading ? '...' : (usage?.emailsDelivered ?? 0).toLocaleString(),
      sub: 'Successfully delivered',
      color: 'from-emerald-500 to-emerald-400',
    },
    {
      label: 'Bounced',
      value: usageLoading ? '...' : (usage?.emailsBounced ?? 0).toLocaleString(),
      sub: 'Hard + soft bounces',
      color: 'from-amber-500 to-orange-400',
    },
    {
      label: 'Complaints',
      value: usageLoading ? '...' : (usage?.emailsComplained ?? 0).toLocaleString(),
      sub: 'Spam reports',
      color: 'from-red-500 to-rose-400',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Platform-wide tenant management and statistics
        </p>
      </div>

      {/* Platform stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {platformStats.map((stat) => (
          <div
            key={stat.label}
            className="stagger-item glass-card rounded-xl p-5 transition-all duration-200 hover:translate-y-[-2px]"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.color}`} />
              <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Tenant list */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
            All Tenants
          </span>
          {tenants && (
            <span className="text-[11px] text-muted-foreground ml-auto">
              {tenants.total} total
            </span>
          )}
        </div>

        {isLoading ? (
          <p className="text-[13px] text-muted-foreground">Loading...</p>
        ) : !tenants || tenants.data.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-[13px]">No tenants found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {tenants.data.map((tenant) => (
              <div key={tenant.id} className="stagger-item py-3 px-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        className="text-[13px] font-medium hover:text-primary transition-colors text-left"
                        onClick={() => setSelectedId(tenant.id)}
                      >
                        {tenant.name}
                      </button>
                      {modeBadge(tenant.mode)}
                      {statusBadge(tenant.status)}
                    </div>
                    <p className="text-[12px] text-muted-foreground">
                      {tenant.ownerEmail} | Sent: {tenant.emailsSent.toLocaleString()} | Limit: {tenant.dailySendLimit.toLocaleString()}/day
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-4 shrink-0">
                    {tenant.mode === 'sandbox' && (
                      <button
                        className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                        onClick={() => promote.mutate({ tenantId: tenant.id })}
                        disabled={promote.isPending}
                      >
                        Promote
                      </button>
                    )}
                    {tenant.status === 'active' && (
                      <>
                        {suspendingId === tenant.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Reason..."
                              value={suspendReason}
                              onChange={(e) => setSuspendReason(e.target.value)}
                              className="text-[12px] px-2 py-1 rounded-md border border-border/50 bg-secondary/50 w-40 focus:outline-none focus:border-primary/50"
                            />
                            <button
                              className="text-[11px] text-red-600 hover:text-red-500 font-medium"
                              onClick={() => {
                                if (suspendReason.trim()) {
                                  suspend.mutate({ tenantId: tenant.id, reason: suspendReason.trim() })
                                  setSuspendingId(null)
                                  setSuspendReason('')
                                }
                              }}
                              disabled={suspend.isPending}
                            >
                              Confirm
                            </button>
                            <button
                              className="text-[11px] text-muted-foreground hover:text-foreground font-medium"
                              onClick={() => {
                                setSuspendingId(null)
                                setSuspendReason('')
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="text-[11px] text-red-600 hover:text-red-500 font-medium"
                            onClick={() => setSuspendingId(tenant.id)}
                          >
                            Suspend
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
                        Unsuspend
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {tenants && tenants.pages > 1 && (
        <div className="flex items-center justify-center gap-4 text-[13px] text-muted-foreground">
          <button
            className="hover:text-foreground transition-colors disabled:opacity-40"
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
          >
            &larr; Previous
          </button>
          <span>Page {tenants.page} of {tenants.pages}</span>
          <button
            className="hover:text-foreground transition-colors disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= tenants.pages}
          >
            Next &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
