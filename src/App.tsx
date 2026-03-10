import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { RealtimeProvider } from '@/contexts/RealtimeContext'

// ── Lazy-loaded pages (code splitting — cada página carrega apenas quando acessada) ──
const LoginPage     = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const StockEntryPage = lazy(() => import('@/pages/StockEntryPage').then(m => ({ default: m.StockEntryPage })))
const OrdersPage    = lazy(() => import('@/pages/OrdersPage').then(m => ({ default: m.OrdersPage })))
const ProductsPage  = lazy(() => import('@/pages/ProductsPage').then(m => ({ default: m.ProductsPage })))
const ReportsPage   = lazy(() => import('@/pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const LocationsPage = lazy(() => import('@/pages/LocationsPage').then(m => ({ default: m.LocationsPage })))
const TransfersPage = lazy(() => import('@/pages/TransfersPage').then(m => ({ default: m.TransfersPage })))
const GuidePage     = lazy(() => import('@/pages/GuidePage').then(m => ({ default: m.GuidePage })))

// ── QueryClient otimizado para zero latência em modo mock ──
const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 0,                    // sem retries — elimina 5s de espera em falha
      staleTime: 5 * 60 * 1000,   // 5 minutos — sem refetch desnecessário entre abas
      gcTime: 30 * 60 * 1000,     // 30 minutos em cache
      refetchOnWindowFocus: false, // não refetch ao focar a janela
      refetchOnMount: false,       // usa cache sem refetch no mount
    },
    mutations: { retry: 0 },
  },
})

// ── Suspense fallback mínimo (sem flash, sem delay visual) ──
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-[hsl(42_60%_55%)] animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={
        <Suspense fallback={<PageLoader />}>
          <LoginPage />
        </Suspense>
      } />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <RealtimeProvider>
              <AppLayout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/"          element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/entrada"   element={<StockEntryPage />} />
                    <Route path="/pedidos"   element={<OrdersPage />} />
                    <Route path="/produtos"  element={<ProductsPage />} />
                    <Route path="/relatorios" element={<ReportsPage />} />
                    <Route path="/locais"      element={<LocationsPage />} />
                    <Route path="/transferencias" element={<TransfersPage />} />
                    <Route path="/guia"           element={<GuidePage />} />
<Route path="*"          element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </AppLayout>
            </RealtimeProvider>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <AppRoutes />
          <Toaster position="top-center" richColors />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
