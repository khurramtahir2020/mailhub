import { useSession } from '../../hooks/use-session'

export function TenantSwitcher() {
  const { tenants, activeTenant, switchTenant } = useSession()

  if (!activeTenant) return null

  return (
    <div className="space-y-0.5">
      {tenants.map((tenant: any) => (
        <button
          key={tenant.id}
          onClick={() => switchTenant(tenant.id)}
          className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
            tenant.id === activeTenant.id
              ? 'bg-secondary text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <span className="truncate">{tenant.name}</span>
          {tenant.id === activeTenant.id && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              tenant.mode === 'production'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {tenant.mode}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
