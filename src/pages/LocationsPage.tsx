import { useState, useMemo } from 'react'
import { useLocations, useCreateLocation, useUpdateLocation, useToggleLocation } from '@/hooks/useLocations'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MapPin, Plus, Edit2, Power, Phone, Package, User } from 'lucide-react'
import { getMockLocationStock } from '@/hooks/useLocationStock'
import type { Location, LocationType } from '@/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<LocationType, string> = {
  deposito: 'Deposito',
  loja_fisica: 'Loja Fisica',
  marketplace: 'Marketplace',
  ecommerce: 'E-commerce',
}

const TYPE_COLORS: Record<LocationType, string> = {
  deposito: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  loja_fisica: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  marketplace: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ecommerce: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const TYPE_ICONS: Record<LocationType, string> = {
  deposito: 'bg-blue-500/20',
  loja_fisica: 'bg-emerald-500/20',
  marketplace: 'bg-purple-500/20',
  ecommerce: 'bg-amber-500/20',
}

interface LocationFormData {
  name: string
  type: LocationType
  address: string
  city: string
  state: string
  contact_name: string
  contact_phone: string
}

const emptyForm: LocationFormData = {
  name: '', type: 'loja_fisica', address: '', city: '', state: '', contact_name: '', contact_phone: '',
}

// ─── Stock Counter Helper ────────────────────────────────────────────────────

function getStockCountForLocation(locationId: string): { products: number; totalUnits: number } {
  const allStock = getMockLocationStock()
  const entries = allStock.filter((ls) => ls.location_id === locationId && ls.quantity > 0)
  return {
    products: entries.length,
    totalUnits: entries.reduce((sum, e) => sum + e.quantity, 0),
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function LocationsPage() {
  const { isManager } = useUserLocation()
  const { data: locations, isLoading } = useLocations(false)
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const toggleLocation = useToggleLocation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LocationFormData>(emptyForm)

  // Pre-compute stock counts for all locations
  const stockMap = useMemo(() => {
    if (!locations) return {}
    const map: Record<string, { products: number; totalUnits: number }> = {}
    for (const loc of locations) {
      map[loc.id] = getStockCountForLocation(loc.id)
    }
    return map
  }, [locations])

  if (!isManager) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
            <MapPin size={28} className="text-white/20" />
          </div>
          <p className="text-white/40 text-sm">Acesso restrito a gestores.</p>
        </div>
      </div>
    )
  }

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(loc: Location) {
    setEditingId(loc.id)
    setForm({
      name: loc.name,
      type: loc.type,
      address: loc.address ?? '',
      city: loc.city ?? '',
      state: loc.state ?? '',
      contact_name: loc.contact_name ?? '',
      contact_phone: loc.contact_phone ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) return

    if (editingId) {
      await updateLocation.mutateAsync({
        id: editingId,
        ...form,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
      })
    } else {
      await createLocation.mutateAsync({
        ...form,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        contact_name: form.contact_name || null,
        contact_phone: form.contact_phone || null,
      })
    }
    setDialogOpen(false)
  }

  const activeCount = locations?.filter((l) => l.active).length ?? 0
  const totalCount = locations?.length ?? 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[hsl(42,60%,55%)]/10 border border-[hsl(42,60%,55%)]/20 flex items-center justify-center">
              <MapPin size={20} className="text-[hsl(42,60%,55%)]" />
            </div>
            <div>
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight text-white"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                Lojas
              </h1>
              <p className="text-sm text-white/40">
                {activeCount} ativ{activeCount === 1 ? 'a' : 'as'} de {totalCount} &middot; Gerencie seus pontos de venda
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={openCreate}
          className="bg-[hsl(42,60%,55%)] hover:bg-[hsl(42,60%,45%)] text-[#0c0e1a] font-semibold shadow-lg shadow-[hsl(42,60%,55%)]/10 transition-all hover:shadow-[hsl(42,60%,55%)]/20"
        >
          <Plus size={16} className="mr-1.5" />
          Novo Local
        </Button>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[220px] rounded-2xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : !locations?.length ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mx-auto">
              <MapPin size={32} className="text-white/15" />
            </div>
            <div>
              <p className="text-white/50 font-medium">Nenhum local cadastrado</p>
              <p className="text-white/30 text-sm mt-1">Crie seu primeiro ponto de venda para comecar</p>
            </div>
            <Button
              onClick={openCreate}
              variant="outline"
              className="border-[hsl(42,60%,55%)]/30 text-[hsl(42,60%,55%)] hover:bg-[hsl(42,60%,55%)]/10"
            >
              <Plus size={16} className="mr-1.5" />
              Criar Local
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {locations.map((loc) => {
            const stock = stockMap[loc.id] ?? { products: 0, totalUnits: 0 }
            const isActive = loc.active
            const fullAddress = [loc.address, loc.city, loc.state].filter(Boolean).join(', ')
            const cityState = [loc.city, loc.state].filter(Boolean).join('/')

            return (
              <div
                key={loc.id}
                className={`
                  group relative rounded-2xl border transition-all duration-200
                  ${isActive
                    ? 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05]'
                    : 'bg-white/[0.01] border-white/[0.03] opacity-60'
                  }
                `}
              >
                {/* Gold left accent for active */}
                {isActive && (
                  <div className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-[hsl(42,60%,55%)]/60" />
                )}

                <div className="p-5 pl-6 space-y-4">
                  {/* Top: Name + Type Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg ${TYPE_ICONS[loc.type]} flex items-center justify-center shrink-0`}>
                        <MapPin size={16} className="text-white/70" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white truncate text-[15px] leading-tight">
                          {loc.name}
                        </h3>
                        {cityState && (
                          <span className="text-[11px] text-white/30 font-medium tracking-wide uppercase">
                            {cityState}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${TYPE_COLORS[loc.type]} text-[11px] shrink-0 font-medium`}
                    >
                      {TYPE_LABELS[loc.type]}
                    </Badge>
                  </div>

                  {/* Address */}
                  {fullAddress && (
                    <p className="text-xs text-white/35 leading-relaxed truncate" title={fullAddress}>
                      {fullAddress}
                    </p>
                  )}

                  {/* Contact + Stock row */}
                  <div className="flex items-center gap-4 text-xs">
                    {loc.contact_name && (
                      <div className="flex items-center gap-1.5 text-white/45 min-w-0">
                        <User size={12} className="shrink-0 text-white/30" />
                        <span className="truncate">{loc.contact_name}</span>
                      </div>
                    )}
                    {loc.contact_phone && (
                      <div className="flex items-center gap-1.5 text-white/45">
                        <Phone size={12} className="shrink-0 text-white/30" />
                        <span>{loc.contact_phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Stock summary pill */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] px-2.5 py-1.5 text-xs">
                      <Package size={12} className="text-[hsl(42,60%,55%)]/70" />
                      <span className="text-white/60">
                        <span className="text-white/80 font-medium">{stock.totalUnits}</span> un.
                        {' em '}
                        <span className="text-white/80 font-medium">{stock.products}</span> produto{stock.products !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {!isActive && (
                      <Badge variant="outline" className="bg-red-500/10 text-red-400/80 border-red-500/20 text-[10px]">
                        Inativa
                      </Badge>
                    )}
                  </div>

                  {/* Divider + Actions */}
                  <div className="border-t border-white/[0.05] pt-3 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(loc)}
                      className="h-8 px-3 text-xs text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                      <Edit2 size={13} className="mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLocation.mutate({ id: loc.id, active: !loc.active })}
                      className={`h-8 px-3 text-xs transition-colors ${
                        isActive
                          ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10'
                          : 'text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                    >
                      <Power size={13} className="mr-1.5" />
                      {isActive ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create/Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg bg-[#0f1225] border-white/[0.08] shadow-2xl shadow-black/50">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[hsl(42,60%,55%)]/10 border border-[hsl(42,60%,55%)]/20 flex items-center justify-center">
                <MapPin size={16} className="text-[hsl(42,60%,55%)]" />
              </div>
              <DialogTitle className="text-lg text-white font-semibold">
                {editingId ? 'Editar Local' : 'Novo Local'}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Name */}
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                Nome <span className="text-[hsl(42,60%,55%)]">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Angelo / Degusto"
                className="bg-white/[0.04] border-white/[0.08] focus:border-[hsl(42,60%,55%)]/40 text-white placeholder:text-white/20 h-10"
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">
                Tipo <span className="text-[hsl(42,60%,55%)]">*</span>
              </Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LocationType })}>
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08] focus:border-[hsl(42,60%,55%)]/40 text-white h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161937] border-white/[0.1]">
                  <SelectItem value="deposito">Deposito</SelectItem>
                  <SelectItem value="loja_fisica">Loja Fisica</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* City / State */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-2">
                <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Cidade</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] focus:border-[hsl(42,60%,55%)]/40 text-white placeholder:text-white/20 h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">UF</Label>
                <Input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  placeholder="MG"
                  maxLength={2}
                  className="bg-white/[0.04] border-white/[0.08] focus:border-[hsl(42,60%,55%)]/40 text-white placeholder:text-white/20 h-10 uppercase"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Endereco</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08] focus:border-[hsl(42,60%,55%)]/40 text-white placeholder:text-white/20 h-10"
              />
            </div>

            {/* Contact / Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Contato</Label>
                <Input
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] focus:border-[hsl(42,60%,55%)]/40 text-white placeholder:text-white/20 h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/60 text-xs font-medium uppercase tracking-wider">Telefone</Label>
                <Input
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] focus:border-[hsl(42,60%,55%)]/40 text-white placeholder:text-white/20 h-10"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/[0.05]">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.06]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-[hsl(42,60%,55%)] hover:bg-[hsl(42,60%,45%)] text-[#0c0e1a] font-semibold shadow-lg shadow-[hsl(42,60%,55%)]/10"
              disabled={!form.name.trim()}
            >
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
