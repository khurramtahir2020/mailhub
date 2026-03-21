import { useAuth0 } from '@auth0/auth0-react'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useSession } from '../hooks/use-session'

export function CallbackPage() {
  const { isAuthenticated, isLoading } = useAuth0()
  const { signupComplete } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      signupComplete.mutate(undefined, {
        onSuccess: () => navigate('/'),
        onError: () => navigate('/'),
      })
    }
  }, [isAuthenticated, isLoading])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Setting up your account...</p>
    </div>
  )
}
