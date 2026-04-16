interface QuickStatProps {
  label: string
  value: string | number
  icon: React.ElementType
  accent?: 'default' | 'gold' | 'red' | 'green'
  onClick?: () => void
}

const ACCENT_CLASS: Record<NonNullable<QuickStatProps['accent']>, string> = {
  default: 'text-foreground',
  gold:    'text-gold',
  red:     'text-red-400',
  green:   'text-emerald-400',
}

export function QuickStat({ label, value, icon: Icon, accent = 'default', onClick }: QuickStatProps) {
  return (
    <div
      className={`bg-card border border-border rounded-xl p-3 flex items-center gap-3 ${
        onClick ? 'cursor-pointer hover:bg-secondary/50 transition-colors' : ''
      }`}
      onClick={onClick}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-secondary">
        <Icon size={15} className="text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className={`text-lg font-black tabular-nums leading-none ${ACCENT_CLASS[accent]}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 truncate">{label}</p>
      </div>
    </div>
  )
}
