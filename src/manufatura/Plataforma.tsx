// Shell da plataforma: sidebar premium + topbar + command palette (Cmd+K).
import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, Boxes, Factory, ShoppingCart, Truck, BarChart3,
  Search, Plus, Command, ArrowRight, RotateCcw, Menu, X,
} from 'lucide-react'
import logo from '@/assets/novalogo.png'
import { useEstoque } from './store'
import { resumoEstoque, statusEstoque, fmtBRL } from './engine'
import { Dashboard } from './pages/Dashboard'
import { Estoque } from './pages/Estoque'
import { Producao } from './pages/Producao'

type Secao = 'dashboard' | 'estoque' | 'producao' | 'compras' | 'movimentacoes' | 'relatorios'

const NAV: { id: Secao; label: string; icon: typeof LayoutDashboard; soon?: boolean }[] = [
  { id: 'dashboard',     label: 'Painel',         icon: LayoutDashboard },
  { id: 'estoque',       label: 'Estoque',        icon: Boxes },
  { id: 'producao',      label: 'Produção',       icon: Factory },
  { id: 'compras',       label: 'Compras',        icon: ShoppingCart, soon: true },
  { id: 'movimentacoes', label: 'Movimentações',  icon: Truck, soon: true },
  { id: 'relatorios',    label: 'Relatórios',     icon: BarChart3, soon: true },
]

const TITULOS: Record<Secao, string> = {
  dashboard: 'Painel de controle', estoque: 'Estoque', producao: 'Produção',
  compras: 'Compras', movimentacoes: 'Movimentações', relatorios: 'Relatórios',
}

export function Plataforma() {
  const [secao, setSecao] = useState<Secao>('dashboard')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const { itens } = useEstoque()
  const resumo = useMemo(() => resumoEstoque(itens), [itens])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
      if (e.key === 'Escape') setPaletteOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const alertas = resumo.repor + resumo.critico

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Sidebar (desktop) — dimmer que o conteúdo ── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col z-40 grid-pattern border-r border-[hsl(var(--gold)/0.08)]"
        style={{ background: 'hsl(var(--sidebar))' }}
      >
        <SidebarBody secao={secao} setSecao={setSecao} alertas={alertas} valor={resumo.valorTotal} />
      </aside>

      {/* ── Sidebar (mobile drawer) ── */}
      {mobileNav && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMobileNav(false)}>
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col grid-pattern border-r border-[hsl(var(--gold)/0.12)]"
            style={{ background: 'hsl(var(--sidebar))' }} onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-text-muted hover:text-foreground" onClick={() => setMobileNav(false)}><X size={18} /></button>
            <SidebarBody secao={secao} setSecao={(s) => { setSecao(s); setMobileNav(false) }} alertas={alertas} valor={resumo.valorTotal} />
          </aside>
        </div>
      )}

      {/* ── Coluna de conteúdo ── */}
      <div className="flex-1 md:ml-64 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 md:px-7 border-b border-[hsl(var(--gold)/0.08)]"
          style={{ background: 'hsl(var(--surface-base) / 0.78)', backdropFilter: 'blur(14px)' }}>
          <button className="md:hidden text-text-muted hover:text-foreground" onClick={() => setMobileNav(true)}><Menu size={20} /></button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">Casa Mr. Lion</span>
            <span className="text-text-muted/50">/</span>
            <span className="text-foreground font-medium">{TITULOS[secao]}</span>
          </div>

          <button onClick={() => setPaletteOpen(true)}
            className="ml-auto hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-[hsl(var(--gold)/0.12)] bg-[hsl(var(--surface-overlay))] text-text-secondary hover:border-[hsl(var(--gold)/0.3)] hover:text-foreground transition-colors">
            <Search size={14} />
            <span className="text-xs">Buscar item, ação…</span>
            <kbd className="ml-2 flex items-center gap-0.5 text-[10px] text-text-muted border border-[hsl(var(--gold)/0.18)] rounded px-1.5 py-0.5"><Command size={10} />K</kbd>
          </button>

          <button onClick={() => setSecao('producao')}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg gradient-gold text-[hsl(30_14%_8%)] font-semibold text-sm hover:brightness-110 transition">
            <Plus size={16} /> <span className="hidden sm:inline">Nova produção</span>
          </button>
        </header>

        <main className="flex-1 p-4 md:p-7 max-w-[1320px] w-full mx-auto">
          {secao === 'dashboard' && <Dashboard goto={setSecao} />}
          {secao === 'estoque' && <Estoque />}
          {secao === 'producao' && <Producao />}
          {(secao === 'compras' || secao === 'movimentacoes' || secao === 'relatorios') && <EmBreve titulo={TITULOS[secao]} />}
        </main>
      </div>

      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} goto={(s) => { setSecao(s); setPaletteOpen(false) }} />}
    </div>
  )
}

function SidebarBody({ secao, setSecao, alertas, valor }: {
  secao: Secao; setSecao: (s: Secao) => void; alertas: number; valor: number
}) {
  const resetar = useEstoque(s => s.resetar)
  return (
    <>
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[hsl(var(--gold)/0.08)]">
        <img src={logo} alt="Mr. Lion" className="w-9 h-9 rounded-lg object-contain" />
        <div className="leading-tight">
          <div className="font-display text-[17px] text-gradient-gold">Mr. Lion</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-text-muted">Estoque &amp; Produção</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="px-3 pb-2 text-[10px] tracking-[0.2em] uppercase text-text-muted">Operação</div>
        {NAV.map(({ id, label, icon: Icon, soon }) => {
          const active = secao === id
          return (
            <button key={id} disabled={soon} onClick={() => setSecao(id)}
              className={`group w-full flex items-center gap-3 h-9 px-3 rounded-lg text-sm transition-all relative ${
                active ? 'text-gold font-semibold' : soon ? 'text-text-muted/50 cursor-default' : 'text-text-secondary hover:text-foreground hover:bg-[hsl(var(--gold)/0.05)]'
              }`}
              style={active ? { background: 'hsl(var(--gold) / 0.10)' } : undefined}>
              {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[hsl(var(--gold))]" />}
              <Icon size={18} strokeWidth={active ? 2 : 1.7} />
              <span>{label}</span>
              {id === 'estoque' && alertas > 0 && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: 'hsl(var(--warn))', background: 'hsl(var(--warn) / 0.15)' }}>{alertas}</span>
              )}
              {soon && <span className="ml-auto text-[9px] tracking-wider uppercase text-text-muted/60">em breve</span>}
            </button>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[hsl(var(--gold)/0.08)] space-y-3">
        <div className="px-3">
          <div className="text-[10px] tracking-[0.15em] uppercase text-text-muted">Valor em estoque</div>
          <div className="font-display text-lg text-foreground tnum">{fmtBRL(valor)}</div>
        </div>
        <button onClick={resetar}
          className="w-full flex items-center gap-2 h-8 px-3 rounded-lg text-xs text-text-muted hover:text-foreground hover:bg-[hsl(var(--gold)/0.05)] transition">
          <RotateCcw size={13} /> Restaurar dados de exemplo
        </button>
      </div>
    </>
  )
}

function EmBreve({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-3 animate-fade-up">
      <div className="w-14 h-14 rounded-2xl grid place-items-center surface-overlay text-gold"><Factory size={26} /></div>
      <h2 className="font-display text-2xl">{titulo}</h2>
      <p className="text-sm text-text-secondary max-w-sm">Módulo da próxima leva — fornecedores, ordens de compra e relatórios entram aqui sobre a mesma base de dados.</p>
    </div>
  )
}

function CommandPalette({ onClose, goto }: { onClose: () => void; goto: (s: Secao) => void }) {
  const [q, setQ] = useState('')
  const { itens } = useEstoque()
  const navHits = NAV.filter(n => !n.soon && n.label.toLowerCase().includes(q.toLowerCase()))
  const itemHits = q ? itens.filter(i => (i.nome + i.sku).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-xl surface-float rounded-2xl overflow-hidden gold-glow animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 h-14 border-b border-[hsl(var(--gold)/0.12)]">
          <Search size={17} className="text-gold" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar item, navegar, executar ação…"
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-text-muted" />
          <kbd className="text-[10px] text-text-muted border border-[hsl(var(--gold)/0.18)] rounded px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2">
          <div className="px-2 py-1 text-[10px] tracking-[0.2em] uppercase text-text-muted">Navegar</div>
          {navHits.map(n => (
            <button key={n.id} onClick={() => goto(n.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-[hsl(var(--gold)/0.08)] hover:text-foreground transition">
              <n.icon size={16} /> {n.label} <ArrowRight size={13} className="ml-auto opacity-0 group-hover:opacity-100" />
            </button>
          ))}
          {itemHits.length > 0 && <div className="px-2 py-1 mt-1 text-[10px] tracking-[0.2em] uppercase text-text-muted">Itens</div>}
          {itemHits.map(i => (
            <button key={i.id} onClick={() => goto('estoque')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-[hsl(var(--gold)/0.08)] hover:text-foreground transition">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${statusEstoque(i) === 'ok' ? 'var(--ok)' : statusEstoque(i) === 'baixo' ? 'var(--warn)' : 'var(--crit)'})` }} />
              {i.nome} <span className="text-text-muted text-xs ml-1">{i.sku}</span>
              <span className="ml-auto text-xs tnum text-text-muted">{i.estoque} {i.uom}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
