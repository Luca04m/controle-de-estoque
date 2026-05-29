// Produção — receita/BOM, fabricáveis em tempo real e simulador de ordem de produção.
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Factory, AlertTriangle, Check, Zap } from 'lucide-react'
import { useEstoque } from '../store'
import { RECEITAS, ITEM_BY_ID } from '../mock'
import { disponibilidade, fmtNum } from '../engine'
import { CategoriaIcon } from '../ui'

const STATUS_MO: Record<string, { label: string; cor: string }> = {
  planejada: { label: 'Planejada', cor: 'var(--neutral)' },
  em_producao: { label: 'Em produção', cor: 'var(--warn)' },
  concluida: { label: 'Concluída', cor: 'var(--ok)' },
  cancelada: { label: 'Cancelada', cor: 'var(--crit)' },
}

export function Producao() {
  const { itens, ordens, registrarProducao } = useEstoque()
  const [produtoId, setProdutoId] = useState('pa_honey')
  const [qty, setQty] = useState(50)

  const receita = RECEITAS.find(r => r.produtoId === produtoId)!
  const disp = useMemo(() => disponibilidade(receita, itens), [receita, itens])
  const pa = ITEM_BY_ID(produtoId)!
  const sustentaById = new Map(disp.porComponente.map(c => [c.itemId, c.sustenta]))

  const podeProduzir = qty > 0 && qty <= disp.fabricaveis
  const excede = qty > disp.fabricaveis

  function registrar() {
    if (!podeProduzir) return
    registrarProducao(produtoId, qty)
    toast.success(`Produção registrada: ${qty} × ${pa.nome.replace('Mr. Lion ', '')}`, {
      description: 'Insumos consumidos, produto acabado em estoque e ordem concluída.',
    })
    setQty(50)
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-end gap-3 mb-5 flex-wrap">
        <div>
          <h1 className="font-display text-3xl leading-none">Produção</h1>
          <p className="text-sm text-text-secondary mt-1">Receita de cada produto e quanto dá pra fabricar com o estoque atual.</p>
        </div>
      </div>

      {/* seletor de produto */}
      <div className="flex gap-2.5 mb-6 flex-wrap">
        {RECEITAS.map(r => {
          const p = ITEM_BY_ID(r.produtoId)!
          const d = disponibilidade(r, itens)
          const active = r.produtoId === produtoId
          return (
            <button key={r.id} onClick={() => setProdutoId(r.produtoId)}
              className={`flex items-center gap-3 pl-3 pr-5 py-2.5 rounded-xl border transition ${active ? 'border-[hsl(var(--gold)/0.5)] gold-glow' : 'border-[hsl(var(--gold)/0.1)] hover:border-[hsl(var(--gold)/0.3)]'}`}
              style={{ background: active ? 'hsl(var(--gold)/0.08)' : 'hsl(var(--surface-raised))' }}>
              {p.fotoUrl && <img src={p.fotoUrl} alt="" className="h-12 w-auto object-contain" />}
              <div className="text-left">
                <div className={`font-medium ${active ? 'text-gold' : ''}`}>{p.nome.replace('Mr. Lion ', '').replace(' 750ml', '')}</div>
                <div className="text-[11px] text-text-muted tnum">{fmtNum(d.fabricaveis)} fabricáveis</div>
              </div>
            </button>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* ── Receita / BOM ── */}
        <div className="lg:col-span-7 rounded-2xl border border-[hsl(var(--gold)/0.1)] overflow-hidden gradient-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--gold)/0.08)]">
            <h2 className="font-display text-xl">Receita · {pa.nome.replace('Mr. Lion ', '')}</h2>
            <span className="text-xs text-text-muted">por 1 garrafa</span>
          </div>
          {disp.incompleta && (
            <div className="mx-5 mt-4 text-[12px] rounded-lg px-3 py-2.5 flex items-center gap-2" style={{ color: 'hsl(var(--warn))', background: 'hsl(var(--warn)/0.12)', border: '1px solid hsl(var(--warn)/0.25)' }}>
              <AlertTriangle size={14} /> Receita líquida ainda não cadastrada — fabricáveis considera só a embalagem.
            </div>
          )}
          <div className="p-2">
            {receita.componentes.map(c => {
              const it = ITEM_BY_ID(c.itemId)!
              const sustenta = sustentaById.get(c.itemId) ?? 0
              const gargalo = c.itemId === disp.gargaloItemId
              return (
                <div key={c.itemId} className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={gargalo ? { background: 'hsl(var(--warn)/0.07)' } : undefined}>
                  <span className="w-8 h-8 rounded-lg grid place-items-center shrink-0 text-gold" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}>
                    <CategoriaIcon categoria={it.categoria} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-2">{it.nome}
                      {gargalo && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: 'hsl(var(--warn))', background: 'hsl(var(--warn)/0.15)' }}>gargalo</span>}</div>
                    <div className="text-[11px] text-text-muted tnum">{fmtNum(c.quantidade)} {c.uom}/garrafa · {fmtNum(it.estoque)} {it.uom} em estoque</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-lg tnum" style={{ color: gargalo ? 'hsl(var(--warn))' : undefined }}>{fmtNum(sustenta)}</div>
                    <div className="text-[10px] text-text-muted -mt-0.5">sustenta</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Simulador de produção ── */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-[hsl(var(--gold)/0.12)] gradient-card p-5 gold-glow">
            <div className="flex items-center gap-2 text-sm font-semibold mb-1"><Zap size={15} className="text-gold" /> Nova ordem de produção</div>
            <div className="text-xs text-text-muted mb-4">quantas garrafas de {pa.nome.replace('Mr. Lion ', '')} produzir</div>

            <div className="flex items-end gap-2 mb-2">
              <input type="number" min={0} value={qty} onChange={e => setQty(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-black/30 border border-[hsl(var(--gold)/0.18)] rounded-xl px-4 py-3 font-display text-3xl tnum outline-none focus:border-[hsl(var(--gold)/0.5)] transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              <span className="text-text-muted pb-3 text-sm">un</span>
            </div>
            <div className="flex gap-1.5 mb-4">
              {[50, 100].map(n => (
                <button key={n} onClick={() => setQty(n)} className="flex-1 h-8 rounded-lg text-xs surface-overlay text-text-secondary hover:text-foreground transition tnum">{n}</button>
              ))}
              <button onClick={() => setQty(disp.fabricaveis)} className="flex-1 h-8 rounded-lg text-xs border border-[hsl(var(--gold)/0.3)] text-gold hover:bg-[hsl(var(--gold)/0.08)] transition tnum">Máx {fmtNum(disp.fabricaveis)}</button>
            </div>

            {excede ? (
              <div className="text-[12px] rounded-lg px-3 py-2.5 mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--crit))', background: 'hsl(var(--crit)/0.12)', border: '1px solid hsl(var(--crit)/0.25)' }}>
                <AlertTriangle size={14} /> Só dá pra produzir {fmtNum(disp.fabricaveis)} agora{disp.gargaloItemId ? ` (falta ${ITEM_BY_ID(disp.gargaloItemId)!.nome})` : ''}.
              </div>
            ) : qty > 0 ? (
              <div className="text-[12px] rounded-lg px-3 py-2.5 mb-3 flex items-center gap-2" style={{ color: 'hsl(var(--ok))', background: 'hsl(var(--ok)/0.1)', border: '1px solid hsl(var(--ok)/0.22)' }}>
                <Check size={14} /> Consome insumos para {fmtNum(qty)} garrafas e adiciona ao estoque de {pa.nome.replace('Mr. Lion ', '')}.
              </div>
            ) : null}

            <button onClick={registrar} disabled={!podeProduzir}
              className={`w-full h-11 rounded-xl font-semibold flex items-center justify-center gap-2 transition ${podeProduzir ? 'gradient-gold text-[hsl(30_14%_8%)] hover:brightness-110' : 'bg-[hsl(var(--surface-overlay))] text-text-muted cursor-not-allowed'}`}>
              <Factory size={16} /> Registrar produção
            </button>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--gold)/0.1)] gradient-card p-5">
            <div className="text-[11px] uppercase tracking-wider text-text-muted">Fabricáveis agora</div>
            <div className="font-display text-4xl text-gold tnum mt-1">{fmtNum(disp.fabricaveis)}</div>
            <div className="text-xs text-text-secondary mt-1">
              {disp.gargaloItemId ? <>limitado por <span className="text-foreground">{ITEM_BY_ID(disp.gargaloItemId)!.nome}</span></> : 'sem gargalo'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Ordens de produção ── */}
      <section className="mt-7">
        <h2 className="font-display text-xl mb-3">Ordens de produção</h2>
        <div className="rounded-2xl border border-[hsl(var(--gold)/0.1)] overflow-hidden gradient-card divide-y divide-[hsl(var(--gold)/0.06)]">
          {ordens.map(o => {
            const p = ITEM_BY_ID(o.produtoId)!
            const s = STATUS_MO[o.status]
            return (
              <div key={o.id} className="flex items-center gap-4 px-5 py-3.5">
                <span className="font-mono text-xs text-text-muted w-20">{o.codigo}</span>
                {p.fotoUrl && <img src={p.fotoUrl} alt="" className="h-9 w-auto object-contain" />}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.nome.replace('Mr. Lion ', '')}</div>
                  <div className="text-[11px] text-text-muted tnum">{fmtNum(o.qtdReal ?? o.qtdPlanejada)} un · {new Date(o.criadaEm).toLocaleDateString('pt-BR')}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full"
                  style={{ color: `hsl(${s.cor})`, background: `hsl(${s.cor}/0.13)`, border: `1px solid hsl(${s.cor}/0.26)` }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${s.cor})` }} />{s.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
