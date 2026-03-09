import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  PackagePlus,
  ShoppingBag,
  Package,
  BarChart3,
  LogOut,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useRealtimeStore } from '@/stores/realtimeStore'
import { IS_MOCK, mockLogout } from '@/lib/mockAuth'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { to: '/entrada',   label: 'Entrada',    icon: <PackagePlus size={18} /> },
  { to: '/pedidos',   label: 'Pedidos',    icon: <ShoppingBag size={18} /> },
  { to: '/produtos',  label: 'Produtos',   icon: <Package size={18} /> },
  { to: '/relatorios',label: 'Relatórios', icon: <BarChart3 size={18} /> },
]

function ConnectionStatus({ collapsed = false }: { collapsed?: boolean }) {
  const { connected } = useRealtimeStore()
  return (
    <div className="flex items-center gap-1.5">
      {connected ? (
        <Wifi size={13} className="text-emerald-400" />
      ) : (
        <WifiOff size={13} className="text-red-500" />
      )}
      {!collapsed && (
        <span className={`text-[10px] font-medium tracking-wide ${connected ? 'text-emerald-400' : 'text-red-500'}`}>
          {connected ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  )
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuthStore()
  const { pendingCount, connected } = useRealtimeStore()
  const navigate = useNavigate()

  // Desktop: collapsed = icon-only mode (w-14)
  const [collapsed, setCollapsed] = useState(false)
  // Mobile: drawer open
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sidebarW = collapsed ? 64 : 240 // px

  async function handleSignOut() {
    if (IS_MOCK) {
      mockLogout()
      useAuthStore.getState().setUser(null)
      useAuthStore.getState().setProfile(null)
      navigate('/login')
      return
    }
    await supabase.auth.signOut()
    navigate('/login')
  }

  const roleLabel = profile?.role === 'manager' ? 'Gestor' : 'Operador'

  // Shared sidebar content — used both in desktop aside and mobile drawer
  function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
    return (
      <>
        {/* Logo area */}
        <div className={`border-b border-border flex items-center ${collapsed ? 'px-0 py-5 justify-center' : 'px-5 py-6'}`}>
          {collapsed ? (
            <img src="/logo-mrlion.webp" alt="Mr. Lion" className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="flex items-center gap-2.5">
              <img src="/logo-mrlion.webp" alt="Mr. Lion" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
              <span
                className="text-base font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, hsl(42 65% 68%), hsl(42 60% 55%))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Mr. Lion
              </span>
            </div>
          )}
        </div>

        {/* User badge — only in expanded mode */}
        {!collapsed && (
          <div className="px-4 py-4 border-b border-border space-y-1.5">
            <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-gold/10 border border-gold/20">
              <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-gold">
                {roleLabel}
              </span>
            </div>
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name ?? '—'}
            </p>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavClick}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg text-sm transition-all ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? `bg-gold/10 text-gold font-semibold ${collapsed ? '' : 'border-l-2 border-gold pl-[10px]'}`
                    : `text-muted-foreground hover:bg-secondary hover:text-foreground ${collapsed ? '' : 'border-l-2 border-transparent pl-[10px]'}`
                }`
              }
            >
              {item.icon}
              {!collapsed && item.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: connection + logout */}
        <div className="p-2 border-t border-border space-y-1">
          <div className={`flex items-center justify-center py-2 ${!collapsed ? 'justify-start px-3' : ''}`}>
            <ConnectionStatus collapsed={collapsed} />
          </div>
          <button
            onClick={handleSignOut}
            title={collapsed ? 'Sair' : undefined}
            className={`w-full flex items-center gap-3 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all ${
              collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
            }`}
          >
            <LogOut size={18} />
            {!collapsed && 'Sair'}
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden sm:flex fixed left-0 top-0 bottom-0 flex-col border-r border-border grid-pattern z-40 transition-all duration-200"
        style={{ background: 'hsl(240 22% 5%)', width: sidebarW }}
      >
        <SidebarContent />

        {/* Collapse toggle button */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-[72px] z-50 flex items-center justify-center w-6 h-6 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-sm"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* ── Mobile Drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={() => setDrawerOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer panel */}
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col border-r border-border grid-pattern"
            style={{ background: 'hsl(240 22% 5%)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button inside drawer */}
            <button
              className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={16} />
            </button>

            <SidebarContent onNavClick={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Mobile Header ── */}
      <header
        className="sticky top-0 z-40 flex sm:hidden items-center justify-between px-4 h-14 border-b border-border"
        style={{ background: 'hsl(240 22% 5%)' }}
      >
        {/* Left: hamburger + brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <img src="/logo-mrlion.webp" alt="Mr. Lion" className="w-7 h-7 rounded-md object-contain flex-shrink-0" />
            <span
              className="text-base font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, hsl(42 65% 68%), hsl(42 60% 55%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Mr. Lion
            </span>
          </div>
        </div>

        {/* Right: status + pending + user */}
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi size={13} className="text-emerald-400" />
          ) : (
            <WifiOff size={13} className="text-red-500" />
          )}
          {pendingCount > 0 && (
            <Badge
              variant="secondary"
              className="text-xs bg-gold/10 text-gold border border-gold/20 h-5 px-1.5"
            >
              {pendingCount}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground max-w-[80px] truncate">
            {profile?.full_name ?? profile?.role ?? '—'}
          </span>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 pb-20 sm:pb-4">
        {children}
      </main>

      {/* Desktop sidebar offset — dynamic based on collapsed state */}
      <style>{`@media (min-width: 640px) { main { margin-left: ${sidebarW}px; transition: margin-left 200ms ease; } }`}</style>

      {/* ── Bottom nav (mobile) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex sm:hidden border-t border-border z-40"
        style={{ background: 'hsl(240 22% 5%)' }}
      >
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] tracking-wider uppercase transition-colors relative ${
                isActive ? 'text-gold' : 'text-muted-foreground hover:text-foreground'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-gold" />
                )}
                <span className={isActive ? 'text-gold' : ''}>{item.icon}</span>
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
