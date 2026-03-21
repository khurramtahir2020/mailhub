import { Routes, Route, Navigate } from 'react-router'
import { useAuth0 } from '@auth0/auth0-react'
import { CallbackPage } from './pages/callback'
import { LoginPage } from './pages/login'
import { AppLayout } from './components/layout/app-layout'
import { DashboardPage } from './pages/dashboard'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth0()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>
    </Routes>
  )
}
