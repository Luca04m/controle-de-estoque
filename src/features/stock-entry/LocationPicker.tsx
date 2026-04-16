import { MapPin } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Location } from '@/types'

const GOLD = 'hsl(42 60% 55%)'

interface LocationPickerProps {
  locations: Location[] | undefined
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  excludeId?: string
  label?: string
}

export function LocationPicker({ locations, value, onChange, disabled, excludeId, label = 'Local' }: LocationPickerProps) {
  const available = (locations ?? []).filter((l) => l.id !== excludeId)

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground font-semibold flex items-center gap-2">
        <MapPin size={12} style={{ color: GOLD }} />
        {label}
      </p>
      <Select value={value} onValueChange={(v) => { if (v) onChange(v) }} disabled={disabled}>
        <SelectTrigger className="h-12 rounded-xl text-sm" disabled={disabled}>
          <SelectValue placeholder="Selecionar local..." />
        </SelectTrigger>
        <SelectContent>
          {available.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
