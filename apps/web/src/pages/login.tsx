import { useAuth0 } from '@auth0/auth0-react'
import { useEffect } from 'react'

export function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0()

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      loginWithRedirect()
    }
  }, [isAuthenticated, isLoading])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Redirecting to login...</p>
    </div>
  )
}
