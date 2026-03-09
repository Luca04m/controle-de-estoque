import novalogo from '@/assets/novalogo.png'
import { useState, useRef, useCallback } from 'react'
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
  HelpCircle,
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
  { to: '/dashboard',  label: 'Dashboard',    icon: <LayoutDashboard size={18} /> },
  { to: '/entrada',    label: 'Movimentação', icon: <PackagePlus size={18} /> },
  { to: '/pedidos',    label: 'Pedidos',      icon: <ShoppingBag size={18} /> },
  { to: '/produtos',   label: 'Produtos',     icon: <Package size={18} /> },
  { to: '/relatorios', label: 'Relatórios',   icon: <BarChart3 size={18} /> },
]

// ── A-03 / A-04: Contraste e tamanho de texto corrigidos
// ── M-01: Distingue "Demo" (modo mock) de "Offline" (sem conexão)
// ── B-03: pendingCount visível no desktop
function ConnectionStatus({
  collapsed = false,
  pendingCount = 0,
}: {
  collapsed?: boolean
  pendingCount?: number
}) {
  const { connected, lastSyncAt } = useRealtimeStore()
  const syncLabel = lastSyncAt
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(lastSyncAt)
    : null

  // M-01: "Demo" apenas quando IS_MOCK ativo, "Offline" quando sem conexão real
  const offlineLabel = IS_MOCK ? 'Demo' : 'Offline'

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {connected ? (
          <Wifi size={13} className="text-emerald-400" />
        ) : (
          <WifiOff size={13} className="text-white/40" />
        )}
        {!collapsed && (
          <span className={`text-xs font-medium tracking-wide ${connected ? 'text-emerald-400' : 'text-white/40'}`}>
            {connected ? 'Tempo real' : offlineLabel}
          </span>
        )}
        {/* B-03: pendingCount badge no desktop */}
        {!collapsed && pendingCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] bg-gold/10 text-gold border border-gold/20 h-4 px-1 ml-0.5"
          >
            {pendingCount}
          </Badge>
        )}
      </div>
      {/* A-03/A-04: text-xs e text-white/40 (antes: text-[9px] text-white/20) */}
      {!collapsed && syncLabel && (
        <span className="text-xs text-white/40 pl-[18px]">
          Atualizado {syncLabel}
        </span>
      )}
      {/* M-09: title explicativo para usuários que não entendem "Dados de demonstração" */}
      {!collapsed && !syncLabel && (
        <span
          className="text-xs text-white/40 pl-[18px] cursor-help"
          title={IS_MOCK
            ? 'Sistema em modo de demonstração — os dados não são salvos no servidor'
            : 'Sem conexão com o servidor. Dados podem estar desatualizados.'
          }
        >
          {IS_MOCK ? 'Dados de demonstração' : 'Sem conexão'}
        </span>
      )}
    </div>
  )
}

interface SidebarContentProps {
  collapsed: boolean
  pendingCount: number
  profile: { role: string; full_name?: string | null } | null
  onNavClick?: () => void
  onSignOut: () => void
}

function SidebarContent({ collapsed, pendingCount, profile, onNavClick, onSignOut }: SidebarContentProps) {
  const roleLabel = profile?.role === 'manager' ? 'Gestor' : 'Operador'

  return (
    <>
      {/* Logo area */}
      <div className={`border-b border-border flex items-center ${collapsed ? 'px-0 py-5 justify-center' : 'px-5 py-6'}`}>
        {collapsed ? (
          <img src={novalogo} alt="Mr. Lion" className="w-8 h-8 rounded-lg object-contain" />
        ) : (
          <div className="flex items-center gap-2.5">
            <img src={novalogo} alt="Mr. Lion" className="w-8 h-8 rounded-lg object-contain flex-shrink-0" />
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

      {/* User badge */}
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
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto" aria-label="Navegação principal">
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
        <div className={`flex items-center py-2 ${!collapsed ? 'px-3' : 'justify-center'}`}>
          {/* B-03: passa pendingCount para o desktop ConnectionStatus */}
          <ConnectionStatus collapsed={collapsed} pendingCount={pendingCount} />
        </div>
        <a
          href={`${import.meta.env.BASE_URL}guia.html`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir guia de uso"
          title={collapsed ? 'Guia de uso' : undefined}
          className={`w-full flex items-center gap-3 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground transition-all ${
            collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5'
          }`}
        >
          <HelpCircle size={18} />
          {!collapsed && 'Guia de uso'}
        </a>
        <button
          onClick={onSignOut}
          aria-label="Sair do sistema"
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

export function AppLayout({ children }: { children: ReactNode }) {
  const { profile } = useAuthStore()
  const { pendingCount, connected } = useRealtimeStore()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // A-06: ref para retornar foco ao hamburger ao fechar drawer
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const sidebarW = collapsed ? 64 : 240

  // A-06: fechar drawer e restaurar foco no hamburger
  const handleDrawerClose = useCallback(() => {
    setDrawerOpen(false)
    // Retorna foco ao botão que abriu o drawer (melhora navegação por teclado)
    requestAnimationFrame(() => {
      hamburgerRef.current?.focus()
    })
  }, [])

  const handleSignOut = useCallback(async () => {
    if (IS_MOCK) {
      mockLogout()
      useAuthStore.getState().setUser(null)
      useAuthStore.getState().setProfile(null)
      navigate('/login')
      return
    }
    await supabase.auth.signOut()
    navigate('/login')
  }, [navigate])

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden sm:flex fixed left-0 top-0 bottom-0 flex-col border-r border-border grid-pattern z-40 transition-all duration-200"
        style={{ background: 'hsl(240 22% 5%)', width: sidebarW }}
        aria-label="Barra lateral"
      >
        <SidebarContent
          collapsed={collapsed}
          pendingCount={pendingCount}
          profile={profile}
          onSignOut={handleSignOut}
        />

        {/* C-03: botão de colapso ampliado (24px → 32px) para cumprir WCAG 2.5.5
            Também usa padding negativo para manter a posição visual */}
        <button
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          className="absolute -right-4 top-[72px] z-50 flex items-center justify-center w-8 h-8 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-all shadow-sm"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>

      {/* ── Mobile Drawer overlay ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 sm:hidden"
          onClick={handleDrawerClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer panel — A-06: role=dialog + aria-modal para screen readers */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col border-r border-border grid-pattern"
            style={{ background: 'hsl(240 22% 5%)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* A-05: aria-label no botão de fechar */}
            <button
              aria-label="Fechar menu de navegação"
              className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
              onClick={handleDrawerClose}
            >
              <X size={16} />
            </button>

            <SidebarContent
              collapsed={false}
              pendingCount={pendingCount}
              profile={profile}
              onNavClick={handleDrawerClose}
              onSignOut={handleSignOut}
            />
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
          {/* A-05/A-06: aria-label + ref para retorno de foco */}
          <button
            ref={hamburgerRef}
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu de navegação"
            aria-expanded={drawerOpen}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <img src={novalogo} alt="Mr. Lion" className="w-7 h-7 rounded-md object-contain flex-shrink-0" />
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
          <a
            href={`${import.meta.env.BASE_URL}guia.html`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Abrir guia de uso"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
          >
            <HelpCircle size={16} />
          </a>
          {/* A-03: text-xs ao invés de text-[10px] */}
          <span className="text-xs text-muted-foreground max-w-[80px] truncate">
            {profile?.full_name ?? profile?.role ?? '—'}
          </span>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 pb-20 sm:pb-4">
        {children}
      </main>

      {/* Desktop sidebar offset */}
      <style>{`@media (min-width: 640px) { main { margin-left: ${sidebarW}px; transition: margin-left 200ms ease; } }`}</style>

      {/* ── Bottom nav (mobile) ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 flex sm:hidden border-t border-border z-40"
        style={{ background: 'hsl(240 22% 5%)' }}
        aria-label="Navegação por abas"
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
