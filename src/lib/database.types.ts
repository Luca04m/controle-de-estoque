// Simplified database types — full typegen available via Supabase CLI
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type ProductCategory = 'whisky' | 'rtd' | 'kit' | 'acessorio'
export type MovementAction = 'in' | 'out' | 'adjustment' | 'loss'
export type UserRole = 'operator' | 'manager'
export type OrderStatus = 'pending' | 'confirmed' | 'delivered'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; user_id: string; role: UserRole; location_id: string | null; full_name: string | null }
        Insert: { id?: string; user_id: string; role: UserRole; location_id?: string | null; full_name?: string | null }
        Update: { role?: UserRole; location_id?: string | null; full_name?: string | null }
      }
      products: {
        Row: { id: string; name: string; sku: string; category: ProductCategory; current_stock: number; min_stock: number; active: boolean; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; sku: string; category: ProductCategory; current_stock?: number; min_stock?: number; active?: boolean; created_at?: string; updated_at?: string }
        Update: { name?: string; sku?: string; category?: ProductCategory; current_stock?: number; min_stock?: number; active?: boolean; updated_at?: string }
      }
      stock_movements: {
        Row: { id: string; product_id: string; action: MovementAction; quantity: number; order_id: string | null; user_id: string; notes: string; created_at: string }
        Insert: { id?: string; product_id: string; action: MovementAction; quantity: number; order_id?: string | null; user_id: string; notes: string; created_at?: string }
        Update: { notes?: string }
      }
      delivery_orders: {
        Row: { id: string; items: Json; status: OrderStatus; user_id: string; notes: string | null; reference: string | null; created_at: string }
        Insert: { id?: string; items: Json; status?: OrderStatus; user_id: string; notes?: string | null; reference?: string | null; created_at?: string }
        Update: { status?: OrderStatus; notes?: string | null }
      }
      alerts: {
        Row: { id: string; product_id: string; threshold: number; active: boolean }
        Insert: { id?: string; product_id: string; threshold: number; active?: boolean }
        Update: { threshold?: number; active?: boolean }
      }
    }
    Functions: {
      update_stock: {
        Args: { p_product_id: string; p_delta: number }
        Returns: undefined
      }
    }
  }
}
