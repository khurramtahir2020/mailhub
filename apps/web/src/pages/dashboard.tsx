import { useSession } from '../hooks/use-session'
import { useUsageSummary } from '../hooks/use-usage'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'

export function DashboardPage() {
  const { activeTenant } = useSession()
  const { data: summary, isLoading } = useUsageSummary()

  const deliveryRate =
    summary && summary.emailsSent > 0
      ? `${((summary.emailsDelivered / summary.emailsSent) * 100).toFixed(1)}%`
      : '--'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emails Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {isLoading ? '...' : summary?.emailsSent ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {isLoading ? '...' : deliveryRate}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mode
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold capitalize">{activeTenant?.mode || '--'}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
