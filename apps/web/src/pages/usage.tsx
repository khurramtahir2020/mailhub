import { useMemo } from 'react'
import { useUsage, useUsageSummary } from '../hooks/use-usage'

function formatDate(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().split('T')[0]
}

export function UsagePage() {
  const from = useMemo(() => formatDate(30), [])
  const to = useMemo(() => formatDate(0), [])

  const { data: summary, isLoading: summaryLoading } = useUsageSummary()
  const { data: daily, isLoading: dailyLoading } = useUsage(from, to)

  const stats = [
    {
      label: 'Sent',
      value: summaryLoading ? '...' : (summary?.emailsSent ?? 0).toLocaleString(),
      color: 'from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]',
    },
    {
      label: 'Delivered',
      value: summaryLoading ? '...' : (summary?.emailsDelivered ?? 0).toLocaleString(),
      color: 'from-emerald-500 to-emerald-400',
    },
    {
      label: 'Bounced',
      value: summaryLoading ? '...' : (summary?.emailsBounced ?? 0).toLocaleString(),
      color: 'from-amber-500 to-orange-400',
    },
    {
      label: 'Complained',
      value: summaryLoading ? '...' : (summary?.emailsComplained ?? 0).toLocaleString(),
      color: 'from-red-500 to-rose-400',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Email sending statistics and daily breakdown
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${stat.color}`} />
              <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Daily breakdown table */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]" />
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Daily Breakdown (Last 30 Days)</span>
        </div>

        {dailyLoading ? (
          <p className="text-[13px] text-muted-foreground">Loading...</p>
        ) : !daily || daily.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground text-[13px]">No usage data for this period.</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left py-2.5 pr-4 text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                  <th className="text-right py-2.5 px-4 text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Sent</th>
                  <th className="text-right py-2.5 px-4 text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Delivered</th>
                  <th className="text-right py-2.5 px-4 text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Bounced</th>
                  <th className="text-right py-2.5 pl-4 text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Complained</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date} className="border-b border-border/20 last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="py-2.5 pr-4 font-mono text-[12px]">{row.date}</td>
                    <td className="text-right py-2.5 px-4">{row.emailsSent}</td>
                    <td className="text-right py-2.5 px-4 text-emerald-400">{row.emailsDelivered}</td>
                    <td className="text-right py-2.5 px-4 text-amber-400">{row.emailsBounced}</td>
                    <td className="text-right py-2.5 pl-4 text-red-400">{row.emailsComplained}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
