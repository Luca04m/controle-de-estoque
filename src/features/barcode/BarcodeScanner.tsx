import { useEffect, useState } from 'react'
import { ScanLine, X, CheckCircle2 } from 'lucide-react'

// DEMO: stub que simula detecção após 1.5s. Integração real com @zxing/browser em iteração futura.

interface BarcodeScannerProps {
  onDetected: (code: string) => void
  onClose: () => void
  /** Lista de códigos possíveis para demo. Randomiza. */
  demoCodes?: string[]
}

const DEFAULT_DEMO_CODES = [
  '7891000100103',
  '7891000200104',
  '7891000300105',
  '7891000400106',
]

export function BarcodeScanner({ onDetected, onClose, demoCodes = DEFAULT_DEMO_CODES }: BarcodeScannerProps) {
  const [phase, setPhase] = useState<'scanning' | 'detected'>('scanning')
  const [detectedCode, setDetectedCode] = useState<string>('')

  useEffect(() => {
    const t = setTimeout(() => {
      const code = demoCodes[Math.floor(Math.random() * demoCodes.length)]
      setDetectedCode(code)
      setPhase('detected')
      if (navigator.vibrate) navigator.vibrate(60)
    }, 1500)
    return () => clearTimeout(t)
  }, [demoCodes])

  useEffect(() => {
    if (phase !== 'detected') return
    const t = setTimeout(() => onDetected(detectedCode), 900)
    return () => clearTimeout(t)
  }, [phase, detectedCode, onDetected])

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Fechar scanner"
          className="absolute -top-10 right-0 text-muted-foreground hover:text-foreground"
        >
          <X size={20} />
        </button>

        {/* Scanner viewport */}
        <div className="relative aspect-[4/3] bg-card rounded-2xl border border-border overflow-hidden">
          {/* Simulated camera view */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />

          {/* Corner frames */}
          <div className="absolute inset-10">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-gold" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-gold" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-gold" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-gold" />
          </div>

          {phase === 'scanning' ? (
            <>
              {/* Scan line animation */}
              <div className="absolute inset-x-10 top-10 bottom-10 overflow-hidden">
                <div
                  className="w-full h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent"
                  style={{ animation: 'scan-line 1.5s ease-in-out infinite' }}
                />
              </div>
              <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">
                <ScanLine size={18} className="text-gold animate-pulse" />
                <p className="text-xs text-muted-foreground">Aproxime o código de barras</p>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <CheckCircle2 size={40} className="text-emerald-400" />
              <p className="text-sm text-foreground font-bold">Código detectado</p>
              <p className="text-xs text-gold font-mono">{detectedCode}</p>
            </div>
          )}
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Demo: estamos simulando a detecção. Em produção, usa câmera real via PWA.
        </p>
      </div>

      <style>{`
        @keyframes scan-line {
          0%   { transform: translateY(0); }
          50%  { transform: translateY(calc(100% - 2px)); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
