import { useLocations } from '@/hooks/useLocations'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin } from 'lucide-react'

interface LocationSelectorProps {
  value: string | null
  onChange: (locationId: string | null) => void
  /** Show "Todas as lojas" option (only for managers) */
  showAll?: boolean
  /** Disable the selector */
  disabled?: boolean
  /** Required — no "all" option even for managers */
  required?: boolean
  className?: string
}

export function LocationSelector({
  value,
  onChange,
  showAll = false,
  disabled = false,
  required = false,
  className = '',
}: LocationSelectorProps) {
  const { data: locations } = useLocations()
  const { isManager, userLocationId } = useUserLocation()

  // Operator can only see their own location
  if (!isManager && userLocationId) {
    const loc = locations?.find((l) => l.id === userLocationId)
    return (
      <div className={`flex items-center gap-2 text-sm text-muted-foreground ${className}`}>
        <MapPin size={14} className="text-gold" />
        <span className="font-medium text-foreground">{loc?.name ?? 'Sua loja'}</span>
      </div>
    )
  }

  return (
    <Select
      value={value ?? '__all__'}
      onValueChange={(v) => onChange(v === '__all__' ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger className={`w-full sm:w-[240px] ${className}`}>
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-gold flex-shrink-0" />
          <SelectValue placeholder="Selecionar loja" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {showAll && !required && (
          <SelectItem value="__all__">Todas as lojas</SelectItem>
        )}
        {locations?.map((loc) => (
          <SelectItem key={loc.id} value={loc.id}>
            <div className="flex items-center gap-2">
              <span>{loc.name}</span>
              {loc.city && (
                <span className="text-xs text-muted-foreground">({loc.city}/{loc.state})</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
