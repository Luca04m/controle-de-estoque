import type { OrderItem } from '@/types'
import { getProductImage } from '@/lib/productImages'

const ID_TO_SKU: Record<string, string> = {
  'honey-sg':  'ML-HONEY-SG',
  'honey-cmp': 'ML-HONEY-CMP',
  'honey-png': 'ML-HONEY-PNG',
  'capu-sg':   'ML-CAPU-SG',
  'capu-cmp':  'ML-CAPU-CMP',
  'capu-png':  'ML-CAPU-PNG',
  'blend-sg':  'ML-BLEND-SG',
  'blend-cmp': 'ML-BLEND-CMP',
  'blend-png': 'ML-BLEND-PNG',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

interface OrderItemsTableProps {
  items: OrderItem[]
  totalValue: number
}

export function OrderItemsTable({ items, totalValue }: OrderItemsTableProps) {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'hsl(240 22% 7%)',
        borderColor: 'hsl(240 15% 11%)',
      }}
    >
      <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(240 15% 11%)' }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-white/35">
          Itens do Pedido
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: 'hsl(240 15% 11%)' }}>
        {items.map((item, i) => {
          const itemSku = ID_TO_SKU[item.product_id]
          const itemImg = itemSku ? getProductImage(itemSku) : undefined
          return (
            <div
              key={i}
              className="px-4 py-3 grid text-sm items-center gap-3"
              style={{ gridTemplateColumns: 'auto 1fr auto' }}
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0" style={{ background: 'hsl(240 20% 8%)' }}>
                {itemImg && (
                  <img src={itemImg} alt={item.product_name} className="w-full h-full object-contain" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white/90 font-medium truncate">{item.product_name}</p>
                <p className="text-xs text-white/35 tabular-nums">
                  {fmt(item.unit_price ?? 0)} × {item.quantity}
                </p>
              </div>
              <span className="text-white font-semibold tabular-nums text-right">
                {fmt(item.quantity * (item.unit_price ?? 0))}
              </span>
            </div>
          )
        })}
      </div>
      <div
        className="flex items-center justify-between px-4 py-3 border-t"
        style={{ borderColor: 'hsl(42 60% 55% / 0.15)' }}
      >
        <p className="text-xs text-white/35">
          Total · {items.reduce((s, i) => s + i.quantity, 0)} unidade{items.reduce((s, i) => s + i.quantity, 0) !== 1 ? 's' : ''}
        </p>
        <span
          className="text-2xl font-black tabular-nums"
          style={{ color: 'hsl(42 60% 55%)' }}
        >
          {fmt(totalValue)}
        </span>
      </div>
    </div>
  )
}
