'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { ShieldCheck, ArrowLeft, LogIn } from 'lucide-react'
import { toast } from 'sonner'

export default function OrganizerLogin() {
  const store = useTournamentStore()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!password.trim()) {
      toast.error('Ingresa la contraseña')
      return
    }
    setLoading(true)
    
    // Simple auth: check against tournament passwords
    try {
      const res = await fetch('/api/tournaments')
      if (res.ok) {
        const tournaments = await res.json()
        const validTournament = tournaments.find((t: any) => t.password === password)
        if (validTournament) {
          store.setAuthenticated(true)
          store.setSelectedTournamentId(validTournament.id)
          toast.success('Acceso concedido')
          // Load tournament data
          const detailRes = await fetch(`/api/tournaments/${validTournament.id}`)
          if (detailRes.ok) {
            const data = await detailRes.json()
            store.setTournamentData({
              tournament: data,
              teams: data.teams || [],
              courts: data.courts || [],
              matches: data.matches || [],
            })
          }
          store.setCurrentView('organizer-dashboard')
        } else {
          toast.error('Contraseña incorrecta')
        }
      }
    } catch (err) {
      toast.error('Error de conexión')
    }
    setLoading(false)
  }

  // Also allow any password for demo purposes
  const handleDemoLogin = () => {
    store.setAuthenticated(true)
    toast.success('Modo demo activado')
    store.setCurrentView('organizer-create')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => store.setCurrentView('home')}
          className="text-emerald-400 hover:text-white mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>

        <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
          <CardHeader className="text-center">
            <div className="bg-emerald-600 p-3 rounded-xl mx-auto w-fit mb-4">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl text-white">Acceso Organizador</CardTitle>
            <p className="text-emerald-300 text-sm">Ingresa la contraseña del torneo</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-emerald-300">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Contraseña del torneo"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="bg-white/10 border-emerald-600 text-white placeholder:text-emerald-500"
              />
            </div>
            <Button
              onClick={handleLogin}
              disabled={loading || !password.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-lg py-6"
            >
              <LogIn className="h-5 w-5 mr-2" />
              {loading ? 'Verificando...' : 'Ingresar'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-emerald-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-transparent text-emerald-400">o</span>
              </div>
            </div>

            <Button
              onClick={handleDemoLogin}
              variant="outline"
              className="w-full border-emerald-600 text-emerald-300 hover:bg-emerald-800"
            >
              Modo Demo (crear torneo nuevo)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
