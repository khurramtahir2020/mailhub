import { useMemo } from 'react'
import { useUsage, useUsageSummary } from '../hooks/use-usage'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Usage</h1>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summaryLoading ? '...' : summary?.emailsSent ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summaryLoading ? '...' : summary?.emailsDelivered ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bounced</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summaryLoading ? '...' : summary?.emailsBounced ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Complained</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summaryLoading ? '...' : summary?.emailsComplained ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily Breakdown (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {dailyLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : !daily || daily.length === 0 ? (
            <p className="text-sm text-muted-foreground">No usage data for this period.</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Sent</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Delivered</th>
                    <th className="text-right py-2 px-4 font-medium text-muted-foreground">Bounced</th>
                    <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Complained</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((row) => (
                    <tr key={row.date} className="border-b last:border-0">
                      <td className="py-2 pr-4">{row.date}</td>
                      <td className="text-right py-2 px-4">{row.emailsSent}</td>
                      <td className="text-right py-2 px-4">{row.emailsDelivered}</td>
                      <td className="text-right py-2 px-4">{row.emailsBounced}</td>
                      <td className="text-right py-2 pl-4">{row.emailsComplained}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
