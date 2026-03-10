import { useState } from 'react'
import { useLocations } from '@/hooks/useLocations'
import { useProducts } from '@/hooks/useProducts'
import { useTransferStock } from '@/hooks/useTransferStock'
import { useStockMovements } from '@/hooks/useStockMovements'
import { getMockStockForLocation } from '@/hooks/useLocationStock'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowRightLeft, ArrowRight, Package } from 'lucide-react'
import type { MovementAction } from '@/types'

export function TransfersPage() {
  const { isManager } = useUserLocation()
  const { data: locations } = useLocations()
  const { data: products } = useProducts()
  const transfer = useTransferStock()
  const { data: recentMovements } = useStockMovements({ limit: 20 })

  const [fromId, setFromId] = useState<string>('')
  const [toId, setToId] = useState<string>('')
  const [productId, setProductId] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [notes, setNotes] = useState<string>('')

  if (!isManager) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Transferências são restritas a gestores.
      </div>
    )
  }

  const selectedProduct = products?.find((p) => p.id === productId)
  const availableAtOrigin = fromId && productId ? getMockStockForLocation(productId, fromId) : 0
  const isValid = fromId && toId && productId && quantity > 0 && fromId !== toId && quantity <= availableAtOrigin

  async function handleTransfer() {
    if (!isValid) return
    await transfer.mutateAsync({
      from_location_id: fromId,
      to_location_id: toId,
      product_id: productId,
      quantity,
      notes: notes || undefined,
    })
    setQuantity(1)
    setNotes('')
    setProductId('')
  }

  const transferMovements = recentMovements?.filter((m: { action: MovementAction }) => m.action === 'transfer') ?? []

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <ArrowRightLeft size={20} className="text-gold" />
          Transferências
        </h1>
        <p className="text-sm text-muted-foreground">Mova estoque entre pontos de venda</p>
      </div>

      {/* Transfer Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nova Transferência</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Origin & Destination */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-end">
            <div>
              <Label>Origem</Label>
              <Select value={fromId} onValueChange={(v) => { setFromId(v ?? ''); if (v === toId) setToId('') }}>
                <SelectTrigger><SelectValue placeholder="Selecionar origem" /></SelectTrigger>
                <SelectContent>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden sm:flex items-center justify-center pt-5">
              <ArrowRight size={20} className="text-muted-foreground" />
            </div>

            <div>
              <Label>Destino</Label>
              <Select value={toId} onValueChange={(v) => setToId(v ?? '')}>
                <SelectTrigger><SelectValue placeholder="Selecionar destino" /></SelectTrigger>
                <SelectContent>
                  {locations?.filter((l) => l.id !== fromId).map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product */}
          <div>
            <Label>Produto</Label>
            <Select value={productId} onValueChange={(v) => setProductId(v ?? '')}>
              <SelectTrigger><SelectValue placeholder="Selecionar produto" /></SelectTrigger>
              <SelectContent>
                {products?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-muted-foreground" />
                      <span>{p.name}</span>
                      <span className="text-xs text-muted-foreground">({p.sku})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stock info + quantity */}
          {fromId && productId && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                Disponível na origem: <strong className="text-foreground">{availableAtOrigin}</strong>
              </span>
              {selectedProduct && availableAtOrigin <= selectedProduct.min_stock && (
                <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                  Estoque baixo
                </Badge>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                max={availableAtOrigin}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Reposição semanal"
              />
            </div>
          </div>

          {fromId === toId && fromId !== '' && (
            <p className="text-sm text-red-400">Origem e destino devem ser diferentes.</p>
          )}

          <Button
            onClick={handleTransfer}
            disabled={!isValid || transfer.isPending}
            className="w-full sm:w-auto bg-gold hover:bg-gold/90 text-background"
          >
            <ArrowRightLeft size={16} className="mr-1" />
            {transfer.isPending ? 'Transferindo...' : 'Confirmar Transferência'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent transfers */}
      {transferMovements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transferências Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transferMovements.slice(0, 10).map((mv) => (
                <div key={mv.id} className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
                  <div>
                    <span className="font-medium">{mv.product?.name ?? mv.product_id}</span>
                    <p className="text-xs text-muted-foreground">{mv.notes}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={mv.quantity > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}>
                      {mv.quantity > 0 ? '+' : ''}{mv.quantity}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(mv.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
