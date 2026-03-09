export type UserRole = 'operator' | 'manager'

export interface Profile {
  id: string
  user_id: string
  role: UserRole
  location_id: string | null
  full_name: string | null
}

export type ProductCategory = 'honey' | 'cappuccino' | 'blended' | 'acessorio'

export interface Product {
  id: string
  name: string
  sku: string
  category: ProductCategory
  current_stock: number
  min_stock: number
  active: boolean
  created_at: string
  updated_at: string
}

export type MovementAction = 'in' | 'out' | 'adjustment' | 'loss'

export interface StockMovement {
  id: string
  product_id: string
  action: MovementAction
  quantity: number
  order_id: string | null
  user_id: string
  notes: string
  created_at: string
  product?: Pick<Product, 'name' | 'sku'>
  profile?: Pick<Profile, 'full_name'>
}

export type OrderStatus = 'pending' | 'confirmed' | 'delivered'

export interface OrderItem {
  product_id: string
  product_name: string
  quantity: number
}

export interface DeliveryOrder {
  id: string
  items: OrderItem[]
  status: OrderStatus
  user_id: string
  notes: string | null
  reference: string | null
  created_at: string
  profile?: Pick<Profile, 'full_name'>
}

export interface Alert {
  id: string
  product_id: string
  threshold: number
  active: boolean
}

export interface RealtimeStatus {
  connected: boolean
  lastSyncAt: Date | null
  pendingCount: number
}
