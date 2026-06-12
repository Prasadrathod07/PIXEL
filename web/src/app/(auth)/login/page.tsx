'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Zap, Copy, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const demoUsers = [
  { role: 'Client', email: 'client1@pixeltest.com', password: 'Test@1234', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { role: 'Client 2', email: 'client2@pixeltest.com', password: 'Test@1234', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { role: 'Manager', email: 'manager@pixeltest.com', password: 'Test@1234', color: 'text-purple-400', bg: 'bg-purple-500/10' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter your email and password')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (userData?.role === 'manager') {
        router.push('/manager/dashboard')
      } else {
        router.push('/dashboard')
      }
      router.refresh()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed. Check your credentials.'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (user: (typeof demoUsers)[number]) => {
    setEmail(user.email)
    setPassword(user.password)
    toast.success(`Credentials filled — ${user.role}`)
  }

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background"
      style={{
        backgroundImage:
          'linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      {/* Ambient radial glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="w-[700px] h-[500px] rounded-full blur-[120px]"
          style={{ background: 'radial-gradient(ellipse, hsl(217 91% 60% / 0.08) 0%, transparent 70%)' }}
        />
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-64 h-64 pointer-events-none">
        <div className="absolute top-12 left-12 w-1 h-24 bg-gradient-to-b from-primary/20 to-transparent rounded-full" />
        <div className="absolute top-12 left-12 h-1 w-24 bg-gradient-to-r from-primary/20 to-transparent rounded-full" />
      </div>
      <div className="absolute bottom-0 right-0 w-64 h-64 pointer-events-none">
        <div className="absolute bottom-12 right-12 w-1 h-24 bg-gradient-to-t from-primary/20 to-transparent rounded-full" />
        <div className="absolute bottom-12 right-12 h-1 w-24 bg-gradient-to-l from-primary/20 to-transparent rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 py-10 space-y-3 animate-slide-up">
        {/* Main login card */}
        <div
          className="glass rounded-2xl p-8"
          style={{ boxShadow: '0 0 40px hsl(217 91% 60% / 0.08), 0 0 0 1px hsl(217 33% 14%)' }}
        >
          {/* Logo / Branding */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-5"
              style={{ boxShadow: '0 0 30px hsl(217 91% 60% / 0.25), inset 0 1px 0 hsl(217 91% 60% / 0.1)' }}
            >
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1.5">Sign in to your Pixel account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/90">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="h-10 bg-muted/30 border-border/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-foreground/90">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="h-10 pr-10 bg-muted/30 border-border/70 focus-visible:border-primary/50 focus-visible:ring-primary/20 placeholder:text-muted-foreground/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 text-sm font-medium transition-all duration-200"
                style={{
                  boxShadow: loading
                    ? 'none'
                    : '0 0 24px hsl(217 91% 60% / 0.3), 0 1px 0 hsl(217 91% 70% / 0.2) inset',
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    Sign in
                    <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-border/50 text-center">
            <p className="text-xs text-muted-foreground/60">
              Powered by{' '}
              <span className="text-primary/80 font-medium">Pixel Assessment</span>
            </p>
          </div>
        </div>

        {/* Demo credentials card */}
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block" />
            Demo accounts — click to fill
          </p>
          <div className="space-y-1.5">
            {demoUsers.map((u) => (
              <button
                key={u.email}
                onClick={() => fillDemo(u)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border/40 hover:border-border bg-muted/20 hover:bg-muted/40 transition-all duration-150 group"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${u.bg} ${u.color} w-16 text-center`}>
                    {u.role}
                  </span>
                  <span className="text-xs text-foreground/80 font-mono">{u.email}</span>
                </div>
                <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
