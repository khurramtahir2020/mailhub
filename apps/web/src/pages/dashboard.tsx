import { Link } from 'react-router'
import { useSession } from '../hooks/use-session'
import { useUsageSummary } from '../hooks/use-usage'
import { CardSkeleton } from '../components/ui/skeleton'

export function DashboardPage() {
  const { activeTenant } = useSession()
  const { data: summary, isLoading } = useUsageSummary()

  const sent = summary?.emailsSent ?? 0
  const delivered = summary?.emailsDelivered ?? 0
  const bounced = summary?.emailsBounced ?? 0
  const complained = summary?.emailsComplained ?? 0
  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : '--'
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : '--'

  const stats = [
    {
      label: 'Emails Sent',
      value: sent.toLocaleString(),
      sub: 'This month',
      color: 'from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)]',
    },
    {
      label: 'Delivered',
      value: delivered.toLocaleString(),
      sub: deliveryRate === '--' ? 'No data' : `${deliveryRate}% rate`,
      color: 'from-emerald-500 to-emerald-400',
    },
    {
      label: 'Bounced',
      value: bounced.toLocaleString(),
      sub: bounceRate === '--' ? 'No data' : `${bounceRate}% rate`,
      color: 'from-amber-500 to-orange-400',
    },
    {
      label: 'Complaints',
      value: complained.toLocaleString(),
      sub: 'Keep below 0.1%',
      color: 'from-red-500 to-rose-400',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Overview for <span className="text-foreground font-medium">{activeTenant?.name}</span>
        </p>
      </div>

      {/* Stats grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="stagger-item glass-card rounded-xl p-5 card-lift"
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
      )}

      {/* Mode & limits */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass-card rounded-xl p-5 card-lift">
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
            Account Mode
          </span>
          <div className="flex items-center gap-3 mt-3">
            <span className={`text-lg font-semibold capitalize ${
              activeTenant?.mode === 'production' ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              {activeTenant?.mode || '--'}
            </span>
            {activeTenant?.mode === 'sandbox' && (
              <span className="text-[11px] text-muted-foreground">
                Limited to {activeTenant?.dailySendLimit ?? 50} emails/day
              </span>
            )}
          </div>
        </div>
        <div className="glass-card rounded-xl p-5 card-lift">
          <span className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </span>
          <div className="flex gap-2 mt-3">
            <Link
              to="/domains"
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors press-effect"
            >
              Add Domain
            </Link>
            <Link
              to="/api-keys"
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors press-effect"
            >
              Create API Key
            </Link>
            <Link
              to="/templates"
              className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground transition-colors press-effect"
            >
              New Template
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
