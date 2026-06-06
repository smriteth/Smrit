import { useState } from 'react'
import { useLocation, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useQuery } from 'react-query'
import apiClient from '@/lib/apiClient'
import {
  LayoutDashboard, Truck, Users, Wrench, Route, Fuel, Shield,
  Bell, CreditCard, BarChart3, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react'

const navigation = [
  { name: 'Overview', path: '/overview', icon: LayoutDashboard },
  { name: 'Live Map', path: '/map', icon: Truck },
  { name: 'Fleet', path: '/fleet', icon: Truck },
  { name: 'Drivers', path: '/drivers', icon: Users },
  { name: 'Trips', path: '/trips', icon: Route },
  { name: 'Maintenance', path: '/maintenance', icon: Wrench },
  { name: 'Fuel', path: '/fuel', icon: Fuel },
  { name: 'Geofences', path: '/geofences', icon: Shield },
  { name: 'Alerts', path: '/alerts', icon: Bell, hasBadge: true },
  { name: 'Payroll', path: '/payroll', icon: CreditCard },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const { data: alertCount } = useQuery(
    'alert-count',
    () => apiClient.get('/alerts/unread-count').then(r => r.data.count as number),
    { refetchInterval: 60_000, retry: false }
  )

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
        <img src="/smrit-logo.png" alt="SMRIT" className="w-8 h-8 object-contain flex-shrink-0" />
        {!collapsed && (
          <div>
            <div className="font-bold text-white text-lg leading-tight">SMRIT</div>
            <div className="text-xs text-white/50 leading-tight">Fleet Management</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path || (item.path !== '/overview' && location.pathname.startsWith(item.path))
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              title={collapsed ? item.name : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative ${
                isActive
                  ? 'bg-white/15 text-white font-medium border-l-2 border-secondary ml-0 pl-[10px]'
                  : 'text-white/70 hover:text-white hover:bg-white/8'
              } ${collapsed ? 'justify-center px-2' : ''}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span className="text-sm">{item.name}</span>}
              {item.hasBadge && alertCount && alertCount > 0 && (
                <span className={`${collapsed ? 'absolute -top-1 -right-1' : 'ml-auto'} bg-danger text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center`}>
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className={`p-3 border-t border-white/10 ${collapsed ? 'flex justify-center' : ''}`}>
        {!collapsed && (
          <div className="px-2 py-2 mb-2 rounded-lg bg-white/5">
            <p className="text-xs text-white/40">Signed in as</p>
            <p className="text-sm text-white font-medium truncate">{user?.email || user?.role}</p>
            <p className="text-xs text-secondary/80 capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          title="Logout"
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-danger/20 transition-colors text-sm ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut size={16} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </>
  )

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-primary transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}>
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full bg-primary text-white rounded-r-full p-1 shadow-md hover:bg-primary-light transition-colors"
          style={{ marginLeft: collapsed ? '64px' : '240px', transition: 'margin 0.3s' }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 bg-primary flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-border flex items-center px-4 gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-1.5 rounded-lg hover:bg-neutral-100"
          >
            <Menu size={20} className="text-foreground" />
          </button>
          <div className="flex-1" />
          <Link to="/alerts" className="relative p-1.5 rounded-lg hover:bg-neutral-100">
            <Bell size={20} className="text-muted" />
            {alertCount && alertCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.email ? user.email[0].toUpperCase() : user?.role?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
