import { useState } from 'react'
import {
  HelpCircle, ChevronDown, ChevronRight, LayoutDashboard, PackagePlus, ShoppingBag,
  Package, BarChart3, MapPin, ArrowRightLeft, Wifi, WifiOff, Download, Smartphone,
} from 'lucide-react'

// ── Section Accordion ────────────────────────────────────────────────────────

interface SectionProps {
  num: number
  title: string
  subtitle: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ num, title, subtitle, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <span
          className="w-7 h-7 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0"
          style={{ background: 'hsl(42 60% 55% / 0.15)', color: 'hsl(42 60% 55%)' }}
        >
          {num}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {open ? <ChevronDown size={16} className="text-muted-foreground shrink-0" /> : <ChevronRight size={16} className="text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border/50">
          {children}
        </div>
      )}
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────────────────

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="bg-secondary/30 rounded-lg p-4 space-y-2.5">
      {title && <p className="text-xs font-semibold text-foreground">{title}</p>}
      {children}
    </div>
  )
}

// ── Step ─────────────────────────────────────────────────────────────────────

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span
        className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5"
        style={{ background: 'hsl(42 60% 55% / 0.15)', color: 'hsl(42 60% 55%)' }}
      >
        {n}
      </span>
      <p className="text-sm text-foreground/80 leading-relaxed">{children}</p>
    </div>
  )
}

// ── Tip / Warn ──────────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-gold/5 border border-gold/15">
      <span className="text-sm shrink-0">💡</span>
      <p className="text-xs text-gold/80 leading-relaxed">{children}</p>
    </div>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
      <span className="text-sm shrink-0">⚠️</span>
      <p className="text-xs text-red-400/80 leading-relaxed">{children}</p>
    </div>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    gold: 'bg-gold/10 text-gold border-gold/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    muted: 'bg-secondary text-muted-foreground border-border',
  }
  return (
    <span className={`inline-flex text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-md border ${colors[color] ?? colors.muted}`}>
      {children}
    </span>
  )
}

// ── MovementCard ─────────────────────────────────────────────────────────────

function MvCard({ sign, label, desc, color, tags }: { sign: string; label: string; desc: string; color: string; tags: string[] }) {
  const signColors: Record<string, string> = { gold: 'text-gold', red: 'text-red-400', yellow: 'text-yellow-400', orange: 'text-orange-400' }
  const borderColors: Record<string, string> = { gold: 'border-gold/20 bg-gold/5', red: 'border-red-500/20 bg-red-500/5', yellow: 'border-yellow-500/20 bg-yellow-500/5', orange: 'border-orange-500/20 bg-orange-500/5' }
  return (
    <div className={`p-3.5 rounded-lg border ${borderColors[color] ?? ''}`}>
      <p className={`text-xl font-black font-mono ${signColors[color] ?? ''}`}>{sign}</p>
      <p className="text-sm font-bold text-foreground mt-1">{label}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {tags.map(t => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{t}</span>)}
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function GuidePage() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl text-foreground flex items-center gap-2.5"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(42 60% 55% / 0.15)' }}>
              <HelpCircle size={16} className="text-gold" />
            </div>
            Guia de Uso
          </h1>
          <p className="text-xs text-muted-foreground mt-1 ml-[42px]">Aprenda a usar todas as funcionalidades da plataforma</p>
        </div>
        <span className="text-[10px] font-semibold tracking-[0.1em] uppercase px-2.5 py-1 rounded-full bg-gold/10 text-gold border border-gold/20">v1.0</span>
      </div>

      {/* ── 1. Acesso ───────────────────────────────────────────────── */}
      <Section num={1} title="Acesso ao sistema" subtitle="Login, perfis e modo demo" defaultOpen>
        <Card title="Como entrar">
          <div className="space-y-2">
            <Step n={1}>Acesse o endereço da plataforma no browser</Step>
            <Step n={2}>Digite seu <strong className="text-gold">usuário</strong> e <strong className="text-gold">senha</strong></Step>
            <Step n={3}>Clique em <strong className="text-gold">Entrar</strong> — você será direcionado ao Dashboard</Step>
          </div>
          <Tip>
            <strong>Modo Demo:</strong> Use <code className="text-gold bg-secondary px-1 rounded text-[11px]">angelo</code> ou <code className="text-gold bg-secondary px-1 rounded text-[11px]">joao</code> com senha <code className="text-gold bg-secondary px-1 rounded text-[11px]">1234</code>. Os dados são fictícios e não são salvos.
          </Tip>
        </Card>

        <Card title="Perfis de acesso">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-gold/5 border border-gold/15">
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-gold mb-2">Gestor</p>
              <ul className="space-y-1 text-xs text-foreground/70">
                <li>• Acesso total ao sistema</li>
                <li>• Cadastro e edição de produtos</li>
                <li>• Relatórios completos</li>
                <li>• Cancelamento de pedidos</li>
                <li>• Ajuste de estoque</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-secondary/50 border border-border">
              <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted-foreground mb-2">Operador</p>
              <ul className="space-y-1 text-xs text-foreground/70">
                <li>• Registro de movimentações</li>
                <li>• Criação de pedidos</li>
                <li>• Visualização do dashboard</li>
                <li>• Consulta de produtos</li>
              </ul>
            </div>
          </div>
        </Card>
      </Section>

      {/* ── 2. Navegação ────────────────────────────────────────────── */}
      <Section num={2} title="Navegação" subtitle="Estrutura das telas">
        <Card>
          <div className="space-y-2">
            {[
              { icon: <LayoutDashboard size={14} />, name: 'Dashboard', desc: 'KPIs, movimentações recentes, estoque crítico' },
              { icon: <PackagePlus size={14} />, name: 'Movimentação', desc: 'Entradas, saídas, ajustes e perdas' },
              { icon: <ShoppingBag size={14} />, name: 'Pedidos Delivery', desc: 'Criar, confirmar, entregar e cancelar pedidos' },
              { icon: <ArrowRightLeft size={14} />, name: 'Transferências', desc: 'Mover estoque entre lojas' },
              { icon: <Package size={14} />, name: 'Produtos', desc: 'Cadastro, edição e histórico por item' },
              { icon: <MapPin size={14} />, name: 'Lojas', desc: 'Gerenciar pontos de venda' },
              { icon: <BarChart3 size={14} />, name: 'Relatórios', desc: 'Filtros, tendências e exportação CSV' },
            ].map(item => (
              <div key={item.name} className="flex items-center gap-3 py-1.5">
                <span className="text-gold">{item.icon}</span>
                <span className="text-sm font-medium text-foreground w-28 shrink-0">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Desktop vs. Mobile">
          <ul className="space-y-1.5 text-xs text-foreground/70">
            <li>• <strong className="text-foreground">Desktop:</strong> Menu lateral fixo. Clique na seta para recolher.</li>
            <li>• <strong className="text-foreground">Mobile:</strong> Barra de abas inferior. Toque no ☰ para menu completo.</li>
          </ul>
        </Card>
      </Section>

      {/* ── 3. Dashboard ────────────────────────────────────────────── */}
      <Section num={3} title="Dashboard" subtitle="Pulso do negócio em tempo real">
        <Card title="Indicadores operacionais">
          <div className="space-y-1.5 text-xs text-foreground/70">
            <p><strong className="text-foreground">Movimentações Hoje</strong> — Total de entradas e saídas do dia</p>
            <p><strong className="text-foreground">Pedidos Pendentes</strong> — Criados mas ainda não entregues</p>
            <p><strong className="text-foreground">Estoque Crítico</strong> — Produtos abaixo do mínimo</p>
            <p><strong className="text-foreground">Total em Estoque</strong> — Soma de todas as unidades</p>
          </div>
        </Card>
        <Card title="Gráfico de tendência">
          <p className="text-xs text-foreground/70">
            Mostra <strong className="text-gold">Entradas</strong> vs <strong className="text-red-400">Saídas</strong> nos últimos 30 dias. Identifique picos, reposições em atraso ou perdas.
          </p>
        </Card>
        <Tip>O indicador <strong>Tempo real</strong> no menu confirma a sincronização. <strong>Demo</strong> indica dados fictícios.</Tip>
      </Section>

      {/* ── 4. Movimentação ─────────────────────────────────────────── */}
      <Section num={4} title="Movimentação" subtitle="Registrar qualquer alteração no estoque">
        <Card title="4 tipos de movimentação">
          <div className="grid grid-cols-2 gap-2.5">
            <MvCard sign="+" label="Entrada" desc="Recebimento de mercadoria" color="gold" tags={['Lamas Destilaria', 'Reposição', 'Fornecedor']} />
            <MvCard sign="−" label="Saída" desc="Venda ou transferência" color="red" tags={['Delivery', 'B2B', 'Amostras']} />
            <MvCard sign="±" label="Ajuste" desc="Correção de inventário" color="yellow" tags={['Contagem Física', 'Devolução']} />
            <MvCard sign="−" label="Perda" desc="Dano, extravio ou vencimento" color="orange" tags={['Transporte', 'Armazenamento', 'Extravio']} />
          </div>
        </Card>
        <Card title="Como registrar">
          <div className="space-y-2">
            <Step n={1}>Acesse <strong className="text-gold">Movimentação</strong> no menu</Step>
            <Step n={2}>Busque o produto. Use filtros de categoria.</Step>
            <Step n={3}>Selecione o <strong className="text-gold">tipo</strong> (Entrada / Saída / Ajuste / Perda)</Step>
            <Step n={4}>Defina a <strong className="text-gold">quantidade</strong> usando botões rápidos ou digitando</Step>
            <Step n={5}>Escolha a <strong className="text-gold">origem</strong> e adicione observação</Step>
            <Step n={6}>Clique em <strong className="text-gold">Confirmar</strong></Step>
          </div>
          <Tip>O <strong>estoque projetado</strong> aparece em tempo real enquanto digita.</Tip>
          <Warn>Saídas e Perdas são bloqueadas se a quantidade exceder o estoque disponível.</Warn>
        </Card>
      </Section>

      {/* ── 5. Pedidos ──────────────────────────────────────────────── */}
      <Section num={5} title="Pedidos Delivery" subtitle="Gestão completa de pedidos">
        <Card title="Fluxo de status">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge color="muted">Pendente</Badge><span className="text-muted-foreground">→</span>
            <Badge color="gold">Confirmado</Badge><span className="text-muted-foreground">→</span>
            <Badge color="green">Entregue</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <Badge color="muted">Pendente / Confirmado</Badge><span className="text-muted-foreground">→</span>
            <Badge color="red">Cancelado</Badge>
            <span className="text-[10px] text-muted-foreground">(estoque reposto)</span>
          </div>
        </Card>
        <Card title="Criar um pedido">
          <div className="space-y-2">
            <Step n={1}>Clique em <strong className="text-gold">Novo Pedido</strong></Step>
            <Step n={2}>Adicione produtos — estoque validado em tempo real</Step>
            <Step n={3}>Preencha <strong className="text-gold">endereço</strong> e referência do cliente</Step>
            <Step n={4}>Confirme o pedido</Step>
          </div>
        </Card>
        <Card title="Confirmar entrega">
          <div className="space-y-2">
            <Step n={1}>Localize o pedido na lista</Step>
            <Step n={2}>Clique em <strong className="text-gold">Marcar como Entregue</strong></Step>
          </div>
        </Card>
        <Warn>Pedidos <Badge color="green">Entregue</Badge> não podem ser cancelados. Para corrigir, use Entrada manual.</Warn>
      </Section>

      {/* ── 6. Produtos ─────────────────────────────────────────────── */}
      <Section num={6} title="Produtos" subtitle="Cadastro, edição e histórico">
        <Card title="Categorias">
          <div className="flex gap-2 flex-wrap">
            <Badge color="gold">Honey</Badge>
            <Badge color="orange">Cappuccino</Badge>
            <Badge color="purple">Blended</Badge>
            <Badge color="muted">Acessório</Badge>
          </div>
        </Card>
        <Card title="Estoque mínimo">
          <p className="text-xs text-foreground/70">
            O <strong className="text-gold">estoque mínimo</strong> é o ponto de alerta. Quando o estoque cai abaixo, o produto aparece como <strong className="text-red-400">crítico</strong> no Dashboard.
          </p>
        </Card>
      </Section>

      {/* ── 7. Relatórios ───────────────────────────────────────────── */}
      <Section num={7} title="Relatórios" subtitle="Análise e exportação de dados">
        <Card title="Filtros disponíveis">
          <div className="space-y-1.5 text-xs text-foreground/70">
            <p><strong className="text-foreground">Período</strong> — Entre duas datas</p>
            <p><strong className="text-foreground">Produto</strong> — SKU específico</p>
            <p><strong className="text-foreground">Tipo</strong> — Entrada / Saída / Ajuste / Perda</p>
            <p><strong className="text-foreground">Operador</strong> — Usuário específico</p>
          </div>
        </Card>
        <Card title="Exportar CSV">
          <div className="space-y-2">
            <Step n={1}>Aplique os filtros desejados</Step>
            <Step n={2}>Clique em <strong className="text-gold flex items-center gap-1 inline-flex"><Download size={12} /> Exportar CSV</strong></Step>
            <Step n={3}>Abra no Excel ou Google Sheets</Step>
          </div>
        </Card>
      </Section>

      {/* ── 8. Offline ──────────────────────────────────────────────── */}
      <Section num={8} title="Modo Offline & PWA" subtitle="Funciona sem internet">
        <Card title="Como funciona">
          <div className="space-y-1.5 text-xs text-foreground/70">
            <p className="flex items-center gap-2"><WifiOff size={12} className="text-muted-foreground" /> Quando offline, movimentações são salvas localmente</p>
            <p className="flex items-center gap-2"><Wifi size={12} className="text-emerald-400" /> Ao reconectar, dados sincronizam automaticamente</p>
          </div>
          <Warn>Não feche o app antes de reconectar para garantir sincronização.</Warn>
        </Card>
        <Card title="Instalar como app (PWA)">
          <div className="space-y-1.5 text-xs text-foreground/70">
            <p className="flex items-center gap-2"><Smartphone size={12} className="text-muted-foreground" /> <strong className="text-foreground">iPhone:</strong> Safari → Compartilhar → "Adicionar à Tela"</p>
            <p className="flex items-center gap-2"><Smartphone size={12} className="text-muted-foreground" /> <strong className="text-foreground">Android:</strong> Chrome → Menu → "Adicionar à tela inicial"</p>
            <p className="flex items-center gap-2"><Download size={12} className="text-muted-foreground" /> <strong className="text-foreground">Desktop:</strong> Chrome/Edge → Ícone na barra de endereço</p>
          </div>
        </Card>
      </Section>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-muted-foreground border-t border-border mt-4">
        Mr. Lion Gestão de Estoque · v1.0 · Março 2026
      </div>
    </div>
  )
}
