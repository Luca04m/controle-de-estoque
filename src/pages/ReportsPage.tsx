import { useState } from 'react'
import { useAllMovements } from '@/hooks/useStockMovements'
import { useAllProducts } from '@/hooks/useProducts'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { MovementAction } from '@/types'

const ACTION_LABELS: Record<MovementAction, { label: string; color: string }> = {
  in: { label: 'Entrada', color: 'text-emerald-400' },
  out: { label: 'Saída', color: 'text-red-400' },
  adjustment: { label: 'Ajuste', color: 'text-amber-400' },
  loss: { label: 'Perda', color: 'text-orange-400' },
}

const PAGE_SIZE = 50

export function ReportsPage() {
  const { data: products } = useAllProducts()
  const [filters, setFilters] = useState<{
    product_id?: string
    action?: MovementAction
    from?: string
    to?: string
    limit: number
    offset: number
  }>({ limit: PAGE_SIZE, offset: 0 })

  const { data, isLoading } = useAllMovements(filters)

  function setFilter(key: string, value: string | null | undefined) {
    const resolved = value ?? undefined
    setFilters((f) => ({ ...f, [key]: resolved, offset: 0 } as typeof f))
  }

  function exportCSV() {
    if (!data?.data) return
    const headers = ['Data', 'Produto', 'SKU', 'Ação', 'Quantidade', 'Referência', 'Notas', 'Usuário']
    const rows = data.data.map((m) => [
      new Date(m.created_at).toLocaleString('pt-BR'),
      (m.product as unknown as { name: string } | undefined)?.name ?? '',
      (m.product as unknown as { sku: string } | undefined)?.sku ?? '',
      ACTION_LABELS[m.action]?.label ?? m.action,
      m.quantity,
      m.order_id ?? '',
      m.notes,
      (m.profile as unknown as { full_name: string } | undefined)?.full_name ?? '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mr-lion-movimentacoes-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0
  const currentPage = Math.floor(filters.offset / PAGE_SIZE) + 1

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-2xl text-foreground"
            style={{ fontFamily: '"DM Serif Display", Georgia, serif' }}
          >
            Histórico & Relatórios
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {data ? `${data.count} movimentações encontradas` : 'Carregando...'}
          </p>
        </div>
        <button
          onClick={exportCSV}
          disabled={!data?.data?.length}
          className="h-9 px-4 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all disabled:opacity-40"
        >
          ↓ Exportar CSV
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-card border border-border rounded-xl">
        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Produto</Label>
          <Select onValueChange={(v) => setFilter('product_id', (!v || v === 'all') ? undefined : String(v))}>
            <SelectTrigger className="h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products?.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Tipo</Label>
          <Select onValueChange={(v) => setFilter('action', (!v || v === 'all') ? undefined : String(v))}>
            <SelectTrigger className="h-8 text-xs bg-secondary border-border">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="in">Entrada</SelectItem>
              <SelectItem value="out">Saída</SelectItem>
              <SelectItem value="adjustment">Ajuste</SelectItem>
              <SelectItem value="loss">Perda</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">De</Label>
          <Input
            type="date"
            className="h-8 text-xs bg-secondary border-border"
            onChange={(e) => setFilter('from', e.target.value ? `${e.target.value}T00:00:00` : '')}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] tracking-wider uppercase text-muted-foreground">Até</Label>
          <Input
            type="date"
            className="h-8 text-xs bg-secondary border-border"
            onChange={(e) => setFilter('to', e.target.value ? `${e.target.value}T23:59:59` : '')}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full bg-secondary rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Data/Hora</TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Produto</TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">SKU</TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Tipo</TableHead>
                <TableHead className="text-right text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Qtd</TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Notas</TableHead>
                <TableHead className="text-[10px] tracking-wider uppercase text-muted-foreground font-medium">Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data?.length === 0 ? (
                <TableRow className="border-border">
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhuma movimentação no período selecionado
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((m) => {
                  const config = ACTION_LABELS[m.action]
                  return (
                    <TableRow
                      key={m.id}
                      className="border-border hover:bg-secondary/50 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                        {new Date(m.created_at).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-sm text-foreground">
                        {(m.product as unknown as { name: string } | undefined)?.name ?? '—'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {(m.product as unknown as { sku: string } | undefined)?.sku ?? '—'}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold ${config?.color ?? 'text-muted-foreground'}`}>
                          {config?.label ?? m.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold tabular-nums text-foreground">
                        {m.quantity}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {m.notes}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(m.profile as unknown as { full_name: string } | undefined)?.full_name ?? '—'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setFilters((f) => ({ ...f, offset: f.offset - PAGE_SIZE }))}
              className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, offset: f.offset + PAGE_SIZE }))}
              className="h-8 px-3 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:border-gold/40 transition-all disabled:opacity-40"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
