import { useAuth0 } from '@auth0/auth0-react'
import { useSession } from '../../hooks/use-session'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'

export function Header() {
  const { logout } = useAuth0()
  const { user } = useSession()

  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || '?'

  return (
    <header className="flex h-14 items-center justify-between border-b border-border/50 px-8">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-[12px] text-muted-foreground font-mono">{user?.email}</span>
        <div className="w-px h-5 bg-border/50" />
        <Avatar className="h-7 w-7 ring-1 ring-border/50">
          <AvatarFallback className="text-[10px] font-medium bg-secondary text-secondary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <Button
          variant="ghost"
          size="sm"
          className="text-[12px] text-muted-foreground hover:text-foreground h-7 px-2"
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
        >
          Sign out
        </Button>
      </div>
    </header>
  )
}
