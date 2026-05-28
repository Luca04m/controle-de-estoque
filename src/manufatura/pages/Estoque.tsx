// Estoque — tabela densa de classe mundial + filtros laterais + drawer de detalhe.
import { useMemo, useState } from 'react'
import {
  Search, Rows3, Rows4, X, Plus, Minus, Pencil, ArrowDownUp,
} from 'lucide-react'
import { useEstoque } from '../store'
import { FORNECEDOR_BY_ID, gerarHistorico } from '../mock'
import {
  statusEstoque, STATUS_LABEL, reorderPoint, coberturaDias, valorEstoque, fmtBRL, fmtNum,
} from '../engine'
import { StatusPill, StockBar, CategoriaIcon, Sparkline } from '../ui'
import type { Item, TipoItem, StatusEstoque } from '../types'

type FiltroTipo = 'todos' | TipoItem
type FiltroStatus = 'todos' | StatusEstoque

const TIPO_LABEL: Record<TipoItem, string> = {
  materia_prima: 'Matéria-prima', embalagem: 'Embalagem', produto_acabado: 'Produto acabado',
}

export function Estoque() {
  const { itens, setEstoque } = useEstoque()
  const [tipo, setTipo] = useState<FiltroTipo>('todos')
  const [status, setStatus] = useState<FiltroStatus>('todos')
  const [busca, setBusca] = useState('')
  const [denso, setDenso] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const [ordenarBaixo, setOrdenarBaixo] = useState(true)

  const ativos = useMemo(() => itens.filter(i => i.ativo), [itens])
  const countTipo = (t: FiltroTipo) => t === 'todos' ? ativos.length : ativos.filter(i => i.tipo === t).length
  const countStatus = (s: FiltroStatus) => s === 'todos' ? ativos.length : ativos.filter(i => statusEstoque(i) === s).length

  const filtrados = useMemo(() => {
    let r = ativos
    if (tipo !== 'todos') r = r.filter(i => i.tipo === tipo)
    if (status !== 'todos') r = r.filter(i => statusEstoque(i) === status)
    if (busca) r = r.filter(i => (i.nome + i.sku).toLowerCase().includes(busca.toLowerCase()))
    const sev = (i: Item) => { const s = statusEstoque(i); return s === 'critico' ? 0 : s === 'baixo' ? 1 : 2 }
    return [...r].sort((a, b) => ordenarBaixo ? sev(a) - sev(b) || a.nome.localeCompare(b.nome) : a.nome.localeCompare(b.nome))
  }, [ativos, tipo, status, busca, ordenarBaixo])

  const rowH = denso ? 'h-11' : 'h-[58px]'
  const selItem = sel ? itens.find(i => i.id === sel) ?? null : null

  return (
    <div className="animate-fade-up">
      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="font-display text-3xl leading-none">Estoque</h1>
          <p className="text-sm text-text-secondary mt-1">Insumos, embalagem e produto acabado — saldo, mínimo e reposição.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-[210px_1fr] gap-5">
        {/* ── Filtros laterais ── */}
        <aside className="space-y-5">
          <FilterGroup titulo="Tipo">
            <FilterItem label="Todos" count={countTipo('todos')} active={tipo === 'todos'} onClick={() => setTipo('todos')} />
            {(['materia_prima', 'embalagem', 'produto_acabado'] as TipoItem[]).map(t => (
              <FilterItem key={t} label={TIPO_LABEL[t]} count={countTipo(t)} active={tipo === t} onClick={() => setTipo(t)} />
            ))}
          </FilterGroup>
          <FilterGroup titulo="Situação">
            <FilterItem label="Todas" count={countStatus('todos')} active={status === 'todos'} onClick={() => setStatus('todos')} />
            {(['ok', 'baixo', 'critico'] as StatusEstoque[]).map(s => (
              <FilterItem key={s} label={STATUS_LABEL[s]} count={countStatus(s)} active={status === s} onClick={() => setStatus(s)}
                dot={s === 'ok' ? 'var(--ok)' : s === 'baixo' ? 'var(--warn)' : 'var(--crit)'} />
            ))}
          </FilterGroup>
        </aside>

        {/* ── Tabela ── */}
        <div className="min-w-0">
          {/* view header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou SKU…"
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-[hsl(var(--surface-overlay))] border border-[hsl(var(--gold)/0.1)] text-sm outline-none focus:border-[hsl(var(--gold)/0.4)] transition" />
            </div>
            <span className="text-xs text-text-muted ml-1 tnum">{filtrados.length} itens</span>
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setOrdenarBaixo(o => !o)} title="Ordenar por urgência"
                className={`h-9 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition ${ordenarBaixo ? 'border-[hsl(var(--gold)/0.4)] text-gold' : 'border-[hsl(var(--gold)/0.1)] text-text-muted hover:text-foreground'}`}>
                <ArrowDownUp size={13} /> Urgência
              </button>
              <div className="flex rounded-lg border border-[hsl(var(--gold)/0.1)] overflow-hidden">
                <button onClick={() => setDenso(false)} className={`h-9 w-9 grid place-items-center ${!denso ? 'text-gold bg-[hsl(var(--gold)/0.1)]' : 'text-text-muted'}`}><Rows3 size={15} /></button>
                <button onClick={() => setDenso(true)} className={`h-9 w-9 grid place-items-center ${denso ? 'text-gold bg-[hsl(var(--gold)/0.1)]' : 'text-text-muted'}`}><Rows4 size={15} /></button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--gold)/0.1)] overflow-hidden gradient-card">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-text-muted" style={{ background: 'hsl(var(--surface-overlay))' }}>
                    <th className="text-left font-medium px-4 py-3 sticky left-0" style={{ background: 'hsl(var(--surface-overlay))' }}>Item</th>
                    <th className="text-left font-medium px-3 py-3 hidden sm:table-cell">Tipo</th>
                    <th className="text-right font-medium px-3 py-3">Estoque</th>
                    <th className="text-right font-medium px-3 py-3 hidden md:table-cell">Mínimo</th>
                    <th className="text-center font-medium px-3 py-3">Situação</th>
                    <th className="text-right font-medium px-3 py-3 hidden lg:table-cell">Cobertura</th>
                    <th className="text-right font-medium px-4 py-3 hidden md:table-cell">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(item => {
                    const st = statusEstoque(item)
                    const cob = coberturaDias(item)
                    return (
                      <tr key={item.id} onClick={() => setSel(item.id)}
                        className={`group ${rowH} border-t border-[hsl(var(--gold)/0.06)] cursor-pointer hover:bg-[hsl(var(--gold)/0.04)] transition-colors`}>
                        {/* Item */}
                        <td className="px-4 sticky left-0 bg-transparent group-hover:bg-[hsl(var(--surface-raised))]">
                          <div className="flex items-center gap-3">
                            {item.fotoUrl
                              ? <img src={item.fotoUrl} alt="" className="w-7 h-9 object-contain shrink-0" />
                              : <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-gold" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}><CategoriaIcon categoria={item.categoria} /></span>}
                            <div className="min-w-0">
                              <div className="font-medium text-foreground truncate flex items-center gap-2">{item.nome}
                                {item.compartilhado && <span className="text-[9px] uppercase tracking-wider text-gold-dim border border-[hsl(var(--gold)/0.2)] rounded px-1">compart.</span>}</div>
                              <div className="text-[11px] text-text-muted tnum">{item.sku}</div>
                            </div>
                          </div>
                        </td>
                        {/* Tipo */}
                        <td className="px-3 hidden sm:table-cell text-text-secondary text-xs">{TIPO_LABEL[item.tipo]}</td>
                        {/* Estoque (inline edit) */}
                        <td className="px-3 text-right" onClick={e => e.stopPropagation()}>
                          <div className="inline-flex items-center gap-1 justify-end">
                            <input type="number" value={item.estoque}
                              onChange={e => setEstoque(item.id, parseFloat(e.target.value) || 0)}
                              className="w-16 text-right bg-transparent tnum font-medium text-foreground rounded px-1.5 py-1 outline-none border border-transparent hover:border-[hsl(var(--gold)/0.2)] focus:border-[hsl(var(--gold)/0.5)] focus:bg-black/30 transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                            <span className="text-[11px] text-text-muted w-5 text-left">{item.uom}</span>
                            <Pencil size={11} className="text-text-muted opacity-0 group-hover:opacity-60 transition" />
                          </div>
                        </td>
                        {/* Mínimo */}
                        <td className="px-3 text-right tnum text-text-secondary hidden md:table-cell">{fmtNum(item.min)} <span className="text-[11px] text-text-muted">{item.uom}</span></td>
                        {/* Situação */}
                        <td className="px-3">
                          <div className="flex justify-center"><StatusPill status={st} dense /></div>
                        </td>
                        {/* Cobertura */}
                        <td className="px-3 text-right tnum hidden lg:table-cell">
                          {cob !== null ? <span className={cob < 7 ? 'text-[hsl(var(--warn))]' : 'text-text-secondary'}>{cob} <span className="text-[11px] text-text-muted">dias</span></span> : <span className="text-text-muted">—</span>}
                        </td>
                        {/* Valor */}
                        <td className="px-4 text-right tnum text-text-secondary hidden md:table-cell">{fmtBRL(valorEstoque(item))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {selItem && <ItemDrawer item={selItem} onClose={() => setSel(null)} />}
    </div>
  )
}

function FilterGroup({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted mb-2 px-1">{titulo}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}
function FilterItem({ label, count, active, onClick, dot }: { label: string; count: number; active: boolean; onClick: () => void; dot?: string }) {
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 h-8 rounded-lg text-sm transition ${active ? 'text-gold font-medium' : 'text-text-secondary hover:text-foreground hover:bg-[hsl(var(--gold)/0.05)]'}`}
      style={active ? { background: 'hsl(var(--gold)/0.1)' } : undefined}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${dot})` }} />}
      <span className="flex-1 text-left">{label}</span>
      <span className="text-xs tnum text-text-muted">{count}</span>
    </button>
  )
}

function ItemDrawer({ item, onClose }: { item: Item; onClose: () => void }) {
  const ajustar = useEstoque(s => s.ajustar)
  const fornecedor = FORNECEDOR_BY_ID(item.fornecedorId)
  const hist = useMemo(() => gerarHistorico(item), [item.id])
  // série acumulada terminando no estoque atual
  const serie = useMemo(() => {
    const deltas = hist.map(h => h.delta)
    const soma = deltas.reduce((a, b) => a + b, 0)
    let acc = item.estoque - soma
    return [acc, ...deltas.map(d => (acc += d))]
  }, [hist, item.estoque])
  const st = statusEstoque(item)
  const rop = reorderPoint(item)
  const cob = coberturaDias(item)
  const step = item.uom === 'un' ? 1 : 0.5

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <aside className="relative w-full max-w-md surface-float h-full overflow-y-auto animate-slide-up" style={{ animationName: 'fade-up' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[hsl(var(--gold)/0.1)]">
          <div className="flex items-center gap-3">
            {item.fotoUrl
              ? <img src={item.fotoUrl} alt="" className="w-12 h-16 object-contain" />
              : <span className="w-12 h-12 rounded-xl grid place-items-center text-gold" style={{ background: 'hsl(var(--gold)/0.1)', border: '1px solid hsl(var(--gold)/0.14)' }}><CategoriaIcon categoria={item.categoria} size={22} /></span>}
            <div>
              <h3 className="font-display text-xl leading-tight">{item.nome}</h3>
              <div className="text-xs text-text-muted tnum mt-0.5">{item.sku} · {TIPO_LABEL[item.tipo]}</div>
              <div className="mt-2"><StatusPill status={st} /></div>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-foreground"><X size={18} /></button>
        </div>

        {/* saldo + ajuste rápido */}
        <div className="p-5 border-b border-[hsl(var(--gold)/0.08)]">
          <div className="text-[11px] uppercase tracking-wider text-text-muted">Saldo atual</div>
          <div className="flex items-end gap-3 mt-1">
            <div className="font-display text-4xl tnum">{fmtNum(item.estoque)} <span className="text-base text-text-muted font-sans">{item.uom}</span></div>
            <div className="ml-auto flex items-center gap-1.5">
              <button onClick={() => ajustar(item.id, -step)} className="w-9 h-9 rounded-lg grid place-items-center surface-overlay text-foreground hover:border-[hsl(var(--crit)/0.5)] transition"><Minus size={16} /></button>
              <button onClick={() => ajustar(item.id, step)} className="w-9 h-9 rounded-lg grid place-items-center gradient-gold text-[hsl(30_14%_8%)]"><Plus size={16} /></button>
            </div>
          </div>
          <div className="mt-3"><StockBar item={item} height={6} /></div>
          <div className="flex justify-between text-[11px] text-text-muted mt-1.5">
            <span>mínimo {fmtNum(item.min)} {item.uom}</span>
            <span>ponto de pedido {fmtNum(rop)} {item.uom}</span>
          </div>
        </div>

        {/* métricas */}
        <div className="grid grid-cols-3 divide-x divide-[hsl(var(--gold)/0.08)] border-b border-[hsl(var(--gold)/0.08)]">
          <Metric label="Cobertura" value={cob !== null ? `${cob}` : '—'} unit={cob !== null ? 'dias' : ''} />
          <Metric label="Custo médio" value={fmtBRL(item.custoMedio)} />
          <Metric label="Valor total" value={fmtBRL(valorEstoque(item))} />
        </div>

        {/* histórico */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Movimentação · 14 dias</h4>
            <Sparkline values={serie} width={120} height={32} />
          </div>
          {fornecedor && (
            <div className="mb-4 text-xs flex items-center justify-between p-3 rounded-lg surface-overlay">
              <div><div className="text-text-muted">Fornecedor</div><div className="text-foreground font-medium">{fornecedor.nome}</div></div>
              <div className="text-right"><div className="text-text-muted">Lead time</div><div className="text-foreground tnum">{fornecedor.leadTimeDias} dias</div></div>
            </div>
          )}
          <div className="space-y-0.5">
            {hist.slice().reverse().map(h => (
              <div key={h.id} className="flex items-center gap-3 py-2 text-sm border-b border-[hsl(var(--gold)/0.05)] last:border-0">
                <span className="tnum font-medium w-16 text-right" style={{ color: h.delta >= 0 ? 'hsl(var(--ok))' : 'hsl(var(--crit))' }}>{h.delta >= 0 ? '+' : ''}{fmtNum(h.delta)}</span>
                <span className="text-text-secondary capitalize flex-1">{h.tipo.replace('_', ' ')}</span>
                <span className="text-xs text-text-muted">{new Date(h.criadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
function Metric({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="font-display text-lg mt-1 tnum">{value}{unit && <span className="text-xs text-text-muted font-sans ml-1">{unit}</span>}</div>
    </div>
  )
}
