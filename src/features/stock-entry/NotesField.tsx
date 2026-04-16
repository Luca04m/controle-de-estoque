import { FileText } from 'lucide-react'

const GOLD = 'hsl(42 60% 55%)'
const CARD_BORDER = 'hsl(240 15% 14%)'

interface NotesFieldProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  label?: string
}

export function NotesField({ value, onChange, placeholder = 'Observações (opcional)...', label = 'Observações' }: NotesFieldProps) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold flex items-center gap-2">
        <FileText size={12} style={{ color: GOLD }} />
        {label}
      </p>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 bg-transparent resize-none focus:outline-none transition-all"
        style={{ borderColor: CARD_BORDER }}
        onFocus={(e) => { e.currentTarget.style.borderColor = `${GOLD}80` }}
        onBlur={(e) => { e.currentTarget.style.borderColor = CARD_BORDER }}
      />
    </div>
  )
}
