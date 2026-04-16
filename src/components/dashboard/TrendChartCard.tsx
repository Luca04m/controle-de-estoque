import { MovementTrendChart } from '@/components/MovementTrendChart'

type TrendPoint = { date: string; in: number; out: number }

export function TrendChartCard({ data }: { data: TrendPoint[] | undefined }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Sem dados de tendência</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium">
          Entradas x Saídas — 30 dias
        </p>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" />
            Entradas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-red-500 inline-block rounded" />
            Saídas
          </span>
        </div>
      </div>
      <div className="h-[220px] md:h-[260px]">
        <MovementTrendChart data={data} height={-1} />
      </div>
    </div>
  )
}
