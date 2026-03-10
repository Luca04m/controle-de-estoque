import Dexie, { type Table } from 'dexie'
import type { MovementAction, OrderItem, OrderStatus } from '@/types'

export interface LocalMovement {
  id: string
  product_id: string
  action: MovementAction
  quantity: number
  order_id: string | null
  location_id: string | null
  user_id: string
  notes: string
  created_at: string
  synced: boolean
  sync_error?: string
}

export interface LocalOrder {
  id: string
  items: OrderItem[]
  status: OrderStatus
  user_id: string
  location_id: string | null
  notes: string | null
  reference: string | null
  created_at: string
  synced: boolean
}

class MrLionDB extends Dexie {
  movements!: Table<LocalMovement>
  orders!: Table<LocalOrder>

  constructor() {
    super('MrLionStockDB')
    this.version(1).stores({
      movements: 'id, product_id, synced, created_at',
      orders: 'id, status, synced, created_at',
    })
    this.version(2).stores({
      movements: 'id, product_id, location_id, synced, created_at',
      orders: 'id, status, location_id, synced, created_at',
    })
  }
}

export const db = new MrLionDB()

export async function getPendingMovements(): Promise<LocalMovement[]> {
  return db.movements.where('synced').equals(0).toArray()
}

export async function markMovementSynced(id: string): Promise<void> {
  await db.movements.update(id, { synced: true })
}

export async function saveLocalMovement(movement: LocalMovement): Promise<void> {
  await db.movements.put(movement)
}

export async function saveLocalOrder(order: LocalOrder): Promise<void> {
  await db.orders.put(order)
}

export async function getPendingOrders(): Promise<LocalOrder[]> {
  return db.orders.where('synced').equals(0).toArray()
}

export async function markOrderSynced(id: string): Promise<void> {
  await db.orders.update(id, { synced: true })
}
