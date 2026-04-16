import { Plus } from 'lucide-react'
import { getProductImage } from '@/lib/productImages'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Product } from '@/types'

const GOLD = 'hsl(42 60% 55%)'
const CARD_BG_INNER = 'hsl(240 15% 11%)'
const CARD_BORDER = 'hsl(240 15% 14%)'

interface ProductPickerProps {
  products: Product[] | undefined
  value: string
  onChange: (v: string) => void
  onAdd: () => void
  exclude?: string[]
}

export function ProductPicker({ products, value, onChange, onAdd, exclude = [] }: ProductPickerProps) {
  const available = (products ?? []).filter((p) => !exclude.includes(p.id))

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <Select value={value} onValueChange={(v) => { if (v) onChange(v) }}>
          <SelectTrigger
            className="h-14 rounded-xl border-transparent transition-all hover:border-[hsl(42_60%_55%_/_0.2)]"
            style={{ background: CARD_BG_INNER, borderColor: 'transparent' }}
          >
            <SelectValue placeholder="Selecionar produto..." />
          </SelectTrigger>
          <SelectContent>
            {available.map((p) => {
              const img = getProductImage(p.sku)
              return (
                <SelectItem key={p.id} value={p.id} className="rounded-lg">
                  <div className="flex items-center gap-2.5">
                    {img ? (
                      <img src={img} alt={p.name} className="w-7 h-7 rounded-md object-contain bg-secondary/50" />
                    ) : (
                      <div className="w-7 h-7 rounded-md bg-secondary/50" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground/60">{p.sku} · estoque: {p.current_stock}</p>
                    </div>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>
      <button
        onClick={onAdd}
        disabled={!value}
        className="h-14 w-14 rounded-xl flex items-center justify-center transition-all disabled:opacity-30 shrink-0"
        style={{
          background: value ? `${GOLD}1A` : CARD_BG_INNER,
          border: `1px solid ${value ? GOLD.replace(')', ' / 0.3)') : CARD_BORDER}`,
        }}
      >
        <Plus size={20} style={{ color: value ? GOLD : 'hsl(240 10% 30%)' }} />
      </button>
    </div>
  )
}
