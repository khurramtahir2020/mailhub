import { NavLink } from 'react-router'
import { TenantSwitcher } from './tenant-switcher'

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◈' },
  { to: '/domains', label: 'Domains', icon: '◉' },
  { to: '/templates', label: 'Templates', icon: '❑' },
  { to: '/messages', label: 'Messages', icon: '▹' },
  { to: '/contacts', label: 'Contacts', icon: '◎' },
  { to: '/suppressions', label: 'Suppressions', icon: '⊘' },
  { to: '/usage', label: 'Usage', icon: '▦' },
  { to: '/api-keys', label: 'API Keys', icon: '⚿' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export function Sidebar() {
  return (
    <aside className="flex h-screen w-[260px] flex-col border-r border-border/50 bg-[hsl(220,14%,5%)]">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[hsl(250,90%,65%)] to-[hsl(200,80%,55%)] flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            MailHub
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[hsl(250,90%,65%/0.12)] text-[hsl(250,90%,70%)] border border-[hsl(250,90%,65%/0.15)]">
            BETA
          </span>
        </div>
      </div>

      {/* Tenant Switcher */}
      <div className="px-4 py-4 border-b border-border/50">
        <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          Workspace
        </p>
        <TenantSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[hsl(250,90%,65%/0.1)] text-[hsl(250,90%,75%)] shadow-[inset_0_0_0_1px_hsl(250,90%,65%/0.12)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`
            }
          >
            <span className="text-[15px] opacity-60 group-hover:opacity-100 transition-opacity w-5 text-center">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-border/50">
        <div className="flex items-center gap-2 px-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_hsl(160,65%,50%/0.5)]" />
          <span className="text-[11px] text-muted-foreground">All systems operational</span>
        </div>
      </div>
    </aside>
  )
}
