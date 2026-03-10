import { useState } from 'react'
import { useLocations, useCreateLocation, useUpdateLocation, useToggleLocation } from '@/hooks/useLocations'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MapPin, Plus, Edit2, Power } from 'lucide-react'
import type { Location, LocationType } from '@/types'

const TYPE_LABELS: Record<LocationType, string> = {
  deposito: 'Depósito',
  loja_fisica: 'Loja Física',
  marketplace: 'Marketplace',
  ecommerce: 'E-commerce',
}

const TYPE_COLORS: Record<LocationType, string> = {
  deposito: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  loja_fisica: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  marketplace: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  ecommerce: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
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

export function LocationsPage() {
  const { isManager } = useUserLocation()
  const { data: locations, isLoading } = useLocations(false)
  const createLocation = useCreateLocation()
  const updateLocation = useUpdateLocation()
  const toggleLocation = useToggleLocation()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<LocationFormData>(emptyForm)

  if (!isManager) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Acesso restrito a gestores.
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

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Pontos de Venda</h1>
          <p className="text-sm text-muted-foreground">Gerencie lojas, parceiros e canais de venda</p>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-gold hover:bg-gold/90 text-background">
          <Plus size={16} className="mr-1" />
          Novo Local
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations?.map((loc) => (
            <Card key={loc.id} className={`relative ${!loc.active ? 'opacity-50' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-gold flex-shrink-0" />
                    <CardTitle className="text-base">{loc.name}</CardTitle>
                  </div>
                  <Badge variant="outline" className={TYPE_COLORS[loc.type]}>
                    {TYPE_LABELS[loc.type]}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {(loc.city || loc.state) && (
                  <p className="text-muted-foreground">
                    {[loc.address, loc.city, loc.state].filter(Boolean).join(', ')}
                  </p>
                )}
                {loc.contact_name && (
                  <p className="text-muted-foreground">Contato: {loc.contact_name}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(loc)}>
                    <Edit2 size={14} className="mr-1" /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleLocation.mutate({ id: loc.id, active: !loc.active })}
                  >
                    <Power size={14} className="mr-1" />
                    {loc.active ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Local' : 'Novo Local'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Angelo / Degusto" />
            </div>
            <div>
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as LocationType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposito">Depósito</SelectItem>
                  <SelectItem value="loja_fisica">Loja Física</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                  <SelectItem value="ecommerce">E-commerce</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label>Estado</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="MG" maxLength={2} />
              </div>
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contato</Label>
                <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} className="bg-gold hover:bg-gold/90 text-background" disabled={!form.name.trim()}>
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
