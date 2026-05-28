import { Toaster } from 'sonner'
import { Plataforma } from '@/manufatura/Plataforma'

// Plataforma de Estoque & Produção (manufatura). O fluxo legado de auth/rotas
// permanece no histórico git (branch feat/est-2-refactor) e será reintegrado
// como camada de acesso sobre esta base.
export default function App() {
  return (
    <>
      <Plataforma />
      <Toaster position="top-center" richColors theme="dark" />
    </>
  )
}
