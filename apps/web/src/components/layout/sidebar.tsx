import { NavLink } from 'react-router'
import { TenantSwitcher } from './tenant-switcher'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/domains', label: 'Domains' },
  { to: '/templates', label: 'Templates' },
  { to: '/messages', label: 'Messages' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/suppressions', label: 'Suppressions' },
  { to: '/usage', label: 'Usage' },
  { to: '/api-keys', label: 'API Keys' },
  { to: '/settings', label: 'Settings' },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center border-b px-4">
        <span className="text-lg font-semibold tracking-tight">MailHub</span>
      </div>

      <div className="px-3 py-3 border-b">
        <p className="px-3 mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Workspace</p>
        <TenantSwitcher />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
