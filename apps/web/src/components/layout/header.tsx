import { useAuth0 } from '@auth0/auth0-react'
import { useSession } from '../../hooks/use-session'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Button } from '../ui/button'

export function Header() {
  const { logout } = useAuth0()
  const { user } = useSession()

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || '?'

  return (
    <header className="flex h-14 items-center justify-end border-b px-6 gap-3">
      <span className="text-sm text-muted-foreground">{user?.email}</span>
      <Avatar className="h-8 w-8">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      >
        Sign out
      </Button>
    </header>
  )
}
