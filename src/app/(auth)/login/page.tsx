'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trophy, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Completá todos los campos')
      return
    }

    setLoading(true)
    try {
      const { createBrowserClient } = await import('@/lib/supabase-browser')
      const supabase = createBrowserClient()

      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email o contraseña incorrectos')
        } else {
          toast.error(error.message)
        }
        return
      }

      toast.success('¡Bienvenido!')
      router.push('/dashboard')
    } catch {
      toast.error('Error de conexión')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-emerald-800/50 bg-emerald-950/30 backdrop-blur-sm">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white">Torneos Relámpago</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="bg-white/10 backdrop-blur-sm border-emerald-700/50 w-full max-w-md">
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white">Ingresá a tu cuenta</h1>
              <p className="text-emerald-300 text-sm mt-1">Gestioná tus torneos desde acá</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-emerald-300">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-emerald-600 text-white placeholder:text-emerald-600 pl-10"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-emerald-300">Contraseña</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-white/10 border-emerald-600 text-white placeholder:text-emerald-600 pl-10"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !email || !password}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-lg py-6"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>Ingresar <ArrowRight className="h-5 w-5 ml-2" /></>
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-emerald-400 text-sm">
                ¿No tenés cuenta?{' '}
                <Link href="/registro" className="text-emerald-300 underline font-medium">
                  Creá una gratis
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
