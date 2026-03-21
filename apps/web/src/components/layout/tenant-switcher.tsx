import { useSession } from '../../hooks/use-session'
import { Badge } from '../ui/badge'

export function TenantSwitcher() {
  const { tenants, activeTenant, switchTenant } = useSession()

  if (!activeTenant) return null

  return (
    <div className="space-y-1">
      {tenants.map((tenant) => (
        <button
          key={tenant.id}
          onClick={() => switchTenant(tenant.id)}
          className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
            tenant.id === activeTenant.id
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
          }`}
        >
          <span className="truncate">{tenant.name}</span>
          {tenant.id === activeTenant.id && (
            <Badge variant="outline" className="ml-2 text-xs">{tenant.mode}</Badge>
          )}
        </button>
      ))}
    </div>
  )
}
