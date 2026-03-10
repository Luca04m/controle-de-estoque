import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { IS_MOCK, mockLogin } from '@/lib/mockAuth'
import { useAuthStore } from '@/stores/authStore'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Profile } from '@/types'

const loginSchema = z.object({
  username: z.string().min(1, 'Informe o usuário'),
  password: z.string().min(1, 'Informe a senha'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { setUser, setProfile, setLoading: setAuthLoading } = useAuthStore()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setLoading(true)

    if (IS_MOCK) {
      const session = mockLogin(data.username, data.password)
      if (!session) {
        toast.error('Usuário ou senha incorretos.')
        setLoading(false)
        return
      }
      setUser({ id: 'mock', email: `${session.username}@mock` } as never)
      setProfile({
        id: 'mock',
        user_id: 'mock',
        role: session.role,
        full_name: session.full_name,
        location_id: session.location_id ?? null,
      } as Profile)
      setAuthLoading(false)
      setLoading(false)
      navigate('/')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: data.username,
      password: data.password,
    })
    if (error) {
      toast.error('Credenciais inválidas.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background grid-pattern relative overflow-hidden p-4">
      {/* Radial glow behind form */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[700px] h-[700px] rounded-full opacity-[0.08]"
          style={{
            background: 'radial-gradient(circle, hsl(42 60% 55%) 0%, transparent 65%)',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm space-y-8 animate-slide-up">
        {/* Brand */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl leading-none">🦁</span>
            <span
              className="text-4xl font-bold tracking-tight"
              style={{
                background: 'linear-gradient(135deg, hsl(42 65% 68%), hsl(42 60% 55%), hsl(38 70% 42%))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Mr. Lion
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] font-medium text-muted-foreground tracking-[0.22em] uppercase">
              Gestão de Estoque
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-2xl p-8 space-y-6 gold-glow gradient-card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground"
              >
                Usuário
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="seu usuário"
                autoComplete="username"
                className="h-11 bg-secondary border-input focus:border-gold focus-visible:ring-gold/30 transition-colors rounded-lg"
                {...register('username')}
              />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground"
              >
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11 bg-secondary border-input focus:border-gold focus-visible:ring-gold/30 transition-colors rounded-lg"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-gold glow-pulse text-[hsl(240_25%_4%)] font-bold text-sm tracking-wider uppercase transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:animation-none"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Footer / mock hint */}
        {IS_MOCK ? (
          <div className="space-y-2 text-center">
            <p className="text-xs text-muted-foreground">
              Modo de demonstração · senha:{' '}
              <span className="text-gold font-mono font-semibold">1234</span>
            </p>
            <div className="flex gap-2 justify-center text-[10px] text-muted-foreground">
              <span>angelo → operador</span>
              <span>·</span>
              <span>joao → gestor</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Casa Mr. Lion · Sistema Interno
          </p>
        )}
      </div>
    </div>
  )
}
