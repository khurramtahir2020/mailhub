import { Outlet } from 'react-router'
import { Sidebar } from './sidebar'
import { Header } from './header'

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden noise-bg">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="animate-fade-in max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
