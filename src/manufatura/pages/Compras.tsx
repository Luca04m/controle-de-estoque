// Compras & Fornecedores — sugestão de reposição (ROP) → ordem de compra → recebimento.
import { useMemo } from 'react'
import { toast } from 'sonner'
import { Truck, PackageCheck, ShoppingCart, Clock, Check } from 'lucide-react'
import { useEstoque } from '../store'
import { FORNECEDORES, FORNECEDOR_BY_ID, ITEM_BY_ID } from '../mock'
import { listaCompras, statusEstoque, fmtBRL, fmtNum } from '../engine'
import { CategoriaIcon, StatusPill } from '../ui'
import type { StatusPO } from '../types'

const PO_STATUS: Record<StatusPO, { label: string; cor: string }> = {
  aberta: { label: 'Aguardando', cor: 'var(--warn)' },
  parcial: { label: 'Parcial', cor: 'var(--warn)' },
  recebida: { label: 'Recebida', cor: 'var(--ok)' },
  cancelada: { label: 'Cancelada', cor: 'var(--crit)' },
}

export function Compras() {
  const { itens, compras, criarPO, receberPO } = useEstoque()

  // sugestões de reposição agrupadas por fornecedor
  const porFornecedor = useMemo(() => {
    const sugest = listaCompras(itens)
    const grupos = new Map<string, { itemId: string; comprar: number }[]>()
    sugest.forEach(({ item, comprar }) => {
      const f = item.fornecedorId; if (!f) return
      if (!grupos.has(f)) grupos.set(f, [])
      grupos.get(f)!.push({ itemId: item.id, comprar })
    })
    return [...grupos.entries()].map(([fornId, linhas]) => ({
      fornecedor: FORNECEDOR_BY_ID(fornId)!,
      linhas,
      total: linhas.reduce((t, l) => t + l.comprar * (ITEM_BY_ID(l.itemId)?.custoMedio ?? 0), 0),
    })).sort((a, b) => b.linhas.length - a.linhas.length)
  }, [itens])

  function gerar(fornId: string, linhas: { itemId: string; comprar: number }[]) {
    criarPO(fornId, linhas.map(l => ({ itemId: l.itemId, qtd: l.comprar })))
    toast.success(`Ordem de compra criada — ${FORNECEDOR_BY_ID(fornId)?.nome}`, { description: `${linhas.length} itens solicitados.` })
  }
  function receber(poId: string, codigo: string) {
    receberPO(poId)
    toast.success(`${codigo} recebida`, { description: 'Itens deram entrada no estoque.' })
  }

  return (
    <div className="animate-fade-up space-y-7">
      <div>
        <h1 className="font-display text-3xl leading-none">Compras</h1>
        <p className="text-sm text-text-secondary mt-1">Reposição sugerida pelo ponto de pedido, ordens de compra e fornecedores.</p>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        {/* ── Sugestões de reposição por fornecedor ── */}
        <section className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-xl">A comprar — sugestão</h2>
          {porFornecedor.length === 0 ? (
            <div className="rounded-2xl border border-[hsl(var(--gold)/0.1)] gradient-card p-8 text-center text-sm text-text-secondary">
              <Check size={26} className="mx-auto mb-2" style={{ color: 'hsl(var(--ok))' }} /> Nenhum item abaixo do mínimo — nada a comprar agora.
            </div>
          ) : porFornecedor.map(({ fornecedor, linhas, total }) => (
            <div key={fornecedor.id} className="rounded-2xl border border-[hsl(var(--gold)/0.1)] gradient-card overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[hsl(var(--gold)/0.08)]">
                <span className="w-9 h-9 rounded-lg grid place-items-center text-gold" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}><Truck size={17} /></span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{fornecedor.nome}</div>
                  <div className="text-[11px] text-text-muted">lead time {fornecedor.leadTimeDias} dias · {linhas.length} itens</div>
                </div>
                <button onClick={() => gerar(fornecedor.id, linhas)}
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg gradient-gold text-[hsl(30_14%_8%)] font-semibold text-sm hover:brightness-110 transition">
                  <ShoppingCart size={15} /> Gerar ordem
                </button>
              </div>
              <div className="p-2">
                {linhas.map(l => {
                  const it = ITEM_BY_ID(l.itemId)!
                  return (
                    <div key={l.itemId} className="flex items-center gap-3 px-3 py-2">
                      <span className="text-gold/80"><CategoriaIcon categoria={it.categoria} size={15} /></span>
                      <StatusPill status={statusEstoque(it)} dense />
                      <span className="text-sm flex-1 min-w-0 truncate">{it.nome}</span>
                      <span className="text-xs text-text-muted tnum">tem {fmtNum(it.estoque)} {it.uom}</span>
                      <span className="font-display text-gold text-base tnum w-20 text-right">+{fmtNum(l.comprar)} <span className="text-xs text-text-muted font-sans">{it.uom}</span></span>
                    </div>
                  )
                })}
                <div className="flex justify-between px-3 py-2 mt-1 border-t border-[hsl(var(--gold)/0.06)] text-sm">
                  <span className="text-text-muted">Estimativa</span>
                  <span className="font-medium tnum">{fmtBRL(total)}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* ── Ordens de compra ── */}
        <section className="lg:col-span-5 space-y-4">
          <h2 className="font-display text-xl">Ordens de compra</h2>
          {compras.length === 0 ? (
            <div className="rounded-2xl border border-[hsl(var(--gold)/0.1)] gradient-card p-8 text-center text-sm text-text-secondary">
              <ShoppingCart size={26} className="mx-auto mb-2 text-gold/60" /> Nenhuma ordem ainda. Gere uma a partir das sugestões ao lado.
            </div>
          ) : (
            <div className="space-y-2.5">
              {compras.map(po => {
                const f = FORNECEDOR_BY_ID(po.fornecedorId)
                const s = PO_STATUS[po.status]
                return (
                  <div key={po.id} className="rounded-2xl border border-[hsl(var(--gold)/0.1)] gradient-card p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-muted">{po.codigo}</span>
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ml-auto"
                        style={{ color: `hsl(${s.cor})`, background: `hsl(${s.cor}/0.13)`, border: `1px solid hsl(${s.cor}/0.26)` }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${s.cor})` }} />{s.label}
                      </span>
                    </div>
                    <div className="font-medium mt-1.5">{f?.nome}</div>
                    <div className="text-xs text-text-muted">{po.linhas.length} itens · {fmtBRL(po.total)}</div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[11px] text-text-muted flex items-center gap-1 flex-1"><Clock size={12} /> {new Date(po.criadaEm).toLocaleDateString('pt-BR')}</span>
                      {po.status === 'aberta' ? (
                        <button onClick={() => receber(po.id, po.codigo)}
                          className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition" style={{ color: 'hsl(var(--ok))', background: 'hsl(var(--ok)/0.12)', border: '1px solid hsl(var(--ok)/0.28)' }}>
                          <PackageCheck size={14} /> Receber
                        </button>
                      ) : (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'hsl(var(--ok))' }}><Check size={13} /> recebida</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* ── Fornecedores ── */}
      <section>
        <h2 className="font-display text-xl mb-3">Fornecedores</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FORNECEDORES.map(f => (
            <div key={f.id} className="rounded-2xl border border-[hsl(var(--gold)/0.1)] gradient-card p-4">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-lg grid place-items-center text-gold shrink-0" style={{ background: 'hsl(var(--gold)/0.09)', border: '1px solid hsl(var(--gold)/0.12)' }}><Truck size={16} /></span>
                <div className="min-w-0">
                  <div className="font-medium truncate">{f.nome}</div>
                  <div className="text-[11px] text-text-muted">{f.contato}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs">
                <span className="text-text-muted">lead time <span className="text-foreground tnum">{f.leadTimeDias} dias</span></span>
                <span className="text-text-muted tnum">{f.itensFornecidos.length} itens</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
