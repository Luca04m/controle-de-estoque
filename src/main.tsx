import { StrictMode, Component, type ReactNode, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppError]', error, info)
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', color: '#f87171', background: '#0a0b0f', minHeight: '100vh' }}>
          <h2 style={{ color: '#fbbf24' }}>Erro ao carregar o app</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{err?.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#94a3b8' }}>{err?.stack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

try {
  const root = document.getElementById('root')
  if (!root) throw new Error('No #root element found')
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
} catch (e) {
  document.body.innerHTML = `<div style="padding:24px;font-family:monospace;color:#f87171;background:#0a0b0f;min-height:100vh">
    <h2 style="color:#fbbf24">Erro crítico de inicialização</h2>
    <pre style="white-space:pre-wrap;font-size:13px">${(e as Error)?.message}</pre>
    <pre style="white-space:pre-wrap;font-size:11px;color:#94a3b8">${(e as Error)?.stack}</pre>
  </div>`
}
