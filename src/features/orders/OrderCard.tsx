import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  User,
  RotateCcw,
  CheckCircle2,
  Truck,
  Calendar,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'
import type { OrderItem, DeliveryOrder } from '@/types'
import { getProductImage } from '@/lib/productImages'

// ─── SKU map for image lookup ─────────────────────────────────────────────────

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

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

// ─── Status badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: {
      label: 'Pendente',
      className: 'bg-amber-950/50 text-amber-400 border-amber-800/40',
    },
    confirmed: {
      label: 'Confirmado',
      className: 'bg-[hsl(42_60%_55%/0.1)] text-[hsl(42_60%_55%)] border-[hsl(42_60%_55%/0.3)]',
    },
    delivered: {
      label: 'Entregue',
      className: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
    },
    cancelled: {
      label: 'Cancelado',
      className: 'bg-red-950/50 text-red-400 border-red-800/40',
    },
  }
  const cfg = map[status] ?? {
    label: status,
    className: 'bg-secondary text-muted-foreground border-border',
  }
  return (
    <span
      className={`text-[10px] border rounded-md px-2 py-0.5 font-semibold tracking-wide uppercase ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface OrderCardProps {
  order: DeliveryOrder
  onMarkDelivered?: () => void
  onReorder?: () => void
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onUpdateNotes?: (id: string, notes: string) => void
  onCancelOrder?: (id: string) => void
  onEdit?: (order: DeliveryOrder) => void
  onDelete?: (id: string) => void
  locationName?: string
}

// ─── OrderCard ────────────────────────────────────────────────────────────────

export function OrderCard({
  order,
  onMarkDelivered,
  onReorder,
  selectionMode,
  selected,
  onToggleSelect,
  onUpdateNotes,
  onCancelOrder,
  onEdit,
  onDelete,
  locationName,
}: OrderCardProps) {
  const navigate = useNavigate()
  const items = order.items as OrderItem[]
  const totalValue =
    order.total_value ?? items.reduce((s, i) => s + i.quantity * (i.unit_price ?? 0), 0)
  const operator = (order.profile as { full_name?: string } | undefined)?.full_name ?? '—'
  const displayName = order.reference || order.id.slice(0, 8).toUpperCase()

  const [menuOpen, setMenuOpen] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesValue, setNotesValue] = useState(order.notes ?? '')
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function handleSaveNotes() {
    onUpdateNotes?.(order.id, notesValue)
    setEditingNotes(false)
    setMenuOpen(false)
  }

  function handleConfirmCancel() {
    onCancelOrder?.(order.id)
    setCancelConfirm(false)
    setMenuOpen(false)
  }

  return (
    <div
      className="rounded-xl border overflow-hidden transition-colors duration-150"
      style={{
        backgroundColor: 'hsl(240 22% 7%)',
        borderColor: selected
          ? 'hsl(42 60% 55% / 0.6)'
          : order.status === 'delivered'
          ? 'hsl(152 60% 25% / 0.3)'
          : 'hsl(240 15% 11%)',
      }}
    >
      <div className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {selectionMode && (
              <button
                type="button"
                onClick={onToggleSelect}
                className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                style={{
                  borderColor: selected ? 'hsl(42 60% 55%)' : 'hsl(240 15% 20%)',
                  backgroundColor: selected ? 'hsl(42 60% 55%)' : 'transparent',
                }}
              >
                {selected && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="hsl(240 25% 4%)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => !selectionMode && navigate(`/pedidos/${order.id}`)}
              className="text-sm font-semibold text-white truncate hover:text-[hsl(42_60%_55%)] transition-colors"
            >
              {displayName}
            </button>
            <span className="text-white/35 text-xs shrink-0">{formatDateShort(order.created_at)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={order.status} />
            {!selectionMode && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => { setMenuOpen((v) => !v); setCancelConfirm(false); setEditingNotes(false) }}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-white/35 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-8 z-50 rounded-lg border shadow-xl min-w-[170px] overflow-hidden"
                    style={{
                      backgroundColor: 'hsl(240 20% 10%)',
                      borderColor: 'hsl(240 15% 15%)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { onEdit?.(order); setMenuOpen(false) }}
                      className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                      <Pencil className="w-3.5 h-3.5 text-white/40" />
                      Editar pedido
                    </button>
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button
                        type="button"
                        onClick={() => { setCancelConfirm(true); setEditingNotes(false); setMenuOpen(false) }}
                        className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Cancelar pedido
                      </button>
                    )}
                    {(order.status === 'cancelled' || order.status === 'delivered') && onDelete && (
                      <button
                        type="button"
                        onClick={() => { onDelete(order.id); setMenuOpen(false) }}
                        className="w-full text-left px-3 py-2.5 text-sm text-red-400 hover:bg-red-950/30 transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir registro
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Inline edit notes */}
        {editingNotes && (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={notesValue}
              onChange={(e) => setNotesValue(e.target.value)}
              placeholder="Observações do pedido..."
              className="w-full rounded-lg border px-3 py-2 text-sm text-foreground placeholder:text-white/35 resize-none focus:outline-none transition-all"
              style={{
                backgroundColor: 'hsl(240 22% 9%)',
                borderColor: 'hsl(42 60% 55% / 0.4)',
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveNotes}
                className="h-8 px-3 rounded-md text-xs font-semibold transition-colors"
                style={{ backgroundColor: 'hsl(42 60% 55%)', color: 'hsl(240 25% 4%)' }}
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => { setEditingNotes(false); setNotesValue(order.notes ?? '') }}
                className="h-8 px-3 rounded-md text-xs text-white/40 border hover:text-white transition-colors"
                style={{ borderColor: 'hsl(240 15% 15%)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Inline cancel confirmation */}
        {cancelConfirm && (
          <div
            className="rounded-lg border px-3 py-2.5 space-y-2"
            style={{ borderColor: 'hsl(0 60% 35% / 0.4)', backgroundColor: 'hsl(0 40% 8%)' }}
          >
            <p className="text-xs text-red-400 font-medium">Cancelar este pedido?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmCancel}
                className="h-8 px-3 rounded-md text-xs font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setCancelConfirm(false)}
                className="h-8 px-3 rounded-md text-xs text-white/40 border hover:text-white transition-colors"
                style={{ borderColor: 'hsl(240 15% 15%)' }}
              >
                Voltar
              </button>
            </div>
          </div>
        )}

        {/* Address block */}
        {order.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-[hsl(42_60%_55%/0.7)] shrink-0 mt-0.5" />
            <span className="text-xs text-white/60 leading-relaxed">{order.address}</span>
          </div>
        )}

        {/* Location indicator */}
        {locationName && (
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            <MapPin className="w-3 h-3 text-[hsl(42_60%_55%/0.5)]" />
            <span>{locationName}</span>
          </div>
        )}

        {/* Items table */}
        <div
          className="rounded-lg border divide-y overflow-hidden"
          style={{ borderColor: 'hsl(240 15% 11%)' }}
        >
          {items.map((item, i) => {
            const itemSku = ID_TO_SKU[item.product_id]
            const itemImg = itemSku ? getProductImage(itemSku) : undefined
            return (
              <div
                key={i}
                className="px-3 py-2 grid text-xs items-center gap-2"
                style={{
                  gridTemplateColumns: 'auto 1fr auto auto auto',
                  backgroundColor: i % 2 === 0 ? 'transparent' : 'hsl(240 22% 8%)',
                }}
              >
                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0" style={{ background: 'hsl(240 20% 8%)' }}>
                  {itemImg && (
                    <img src={itemImg} alt={item.product_name} className="w-full h-full object-contain" />
                  )}
                </div>
                <span className="text-white/80 pr-2 truncate">{item.product_name}</span>
                <span className="text-white/35 tabular-nums text-right pr-2.5">×{item.quantity}</span>
                <span className="text-white/35 tabular-nums text-right pr-2.5">
                  {fmt(item.unit_price ?? 0)}
                </span>
                <span className="text-white font-semibold tabular-nums text-right">
                  {fmt(item.quantity * (item.unit_price ?? 0))}
                </span>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="h-px" style={{ backgroundColor: 'hsl(240 15% 11%)' }} />

        {/* Footer row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/35 min-w-0">
            <User className="w-3 h-3 shrink-0" />
            <span className="truncate">{operator}</span>
            <span className="text-white/20 shrink-0">·</span>
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="shrink-0">{formatDate(order.created_at)}</span>
          </div>
          <span
            className="text-xl font-black tabular-nums shrink-0"
            style={{ color: 'hsl(42 60% 55%)' }}
          >
            {fmt(totalValue)}
          </span>
        </div>

        {/* Delivered info */}
        {order.status === 'delivered' && order.delivered_by && (
          <div
            className="flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5"
            style={{
              backgroundColor: 'hsl(152 60% 8% / 0.8)',
              color: 'hsl(152 60% 50%)',
              border: '1px solid hsl(152 60% 20% / 0.3)',
            }}
          >
            <Truck className="w-3 h-3 shrink-0" />
            <span>
              Entregue por {order.delivered_by}
              {order.delivered_at && ` em ${formatDate(order.delivered_at)}`}
            </span>
          </div>
        )}
      </div>

      {/* Action area */}
      {!selectionMode && (onMarkDelivered || onReorder) && (
        <div
          className="border-t px-4 py-3 space-y-2"
          style={{ borderColor: 'hsl(240 15% 11%)' }}
        >
          {onMarkDelivered && (
            <button
              onClick={onMarkDelivered}
              className="w-full h-10 rounded-lg font-semibold text-xs tracking-wide transition-all flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'hsl(152 60% 35% / 0.1)',
                color: 'hsl(152 60% 50%)',
                border: '1px solid hsl(152 60% 35% / 0.25)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(152 60% 35% / 0.18)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(152 60% 35% / 0.1)'
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Marcar como Entregue
            </button>
          )}
          {onReorder && (
            <button
              onClick={onReorder}
              className="w-full h-9 rounded-lg font-medium text-xs border text-white/40 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              style={{ borderColor: 'hsl(240 15% 13%)' }}
            >
              <RotateCcw className="w-3 h-3" />
              Repetir Pedido
            </button>
          )}
        </div>
      )}
    </div>
  )
}
