import { Plus, Minus } from 'lucide-react'

const GOLD = 'hsl(42 60% 55%)'
const CARD_BORDER = 'hsl(240 15% 14%)'

interface QuantityInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  label?: string
}

export function QuantityInput({ value, onChange, min = 1, max, label = 'Quantidade' }: QuantityInputProps) {
  function decrement() { onChange(Math.max(min, value - 1)) }
  function increment() { onChange(max !== undefined ? Math.min(max, value + 1) : value + 1) }

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={decrement}
          disabled={value <= min}
          className="w-12 h-12 rounded-xl border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
          style={{ borderColor: CARD_BORDER, background: 'hsl(240 15% 11%)' }}
        >
          <Minus size={16} />
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10)
            if (!isNaN(n)) onChange(Math.max(min, max !== undefined ? Math.min(max, n) : n))
          }}
          className="flex-1 h-12 rounded-xl border text-center text-xl font-bold tabular-nums bg-transparent text-foreground focus:outline-none transition-all"
          style={{ borderColor: CARD_BORDER }}
          onFocus={(e) => { e.currentTarget.style.borderColor = `${GOLD}80` }}
          onBlur={(e) => { e.currentTarget.style.borderColor = CARD_BORDER }}
        />
        <button
          type="button"
          onClick={increment}
          disabled={max !== undefined && value >= max}
          className="w-12 h-12 rounded-xl border flex items-center justify-center transition-colors disabled:opacity-30"
          style={{
            background: `${GOLD}1A`,
            borderColor: `${GOLD}4D`,
            color: GOLD,
          }}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  )
}
