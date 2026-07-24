'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Trophy,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'

export default function HomeView() {
  const store = useTournamentStore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-emerald-800 bg-emerald-950/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-3 rounded-xl">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Torneos Relámpago</h1>
              <p className="text-emerald-300 text-sm mt-1">Gestión digital de torneos de fútbol</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center gap-6">
        {/* Organizer access - the main entry point */}
        <Card className="bg-white/10 backdrop-blur-sm border-emerald-600 shadow-lg shadow-emerald-900/20 w-full max-w-md"
          onClick={() => {
            if (store.isAuthenticated) {
              store.setCurrentView('organizer-dashboard')
            } else {
              store.setCurrentView('organizer-login')
            }
          }}
        >
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 p-3 rounded-xl">
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-white">Acceso Organizador</h2>
                <p className="text-emerald-300 text-sm mt-1">
                  Panel de control &bull; Mesa de control &bull; Gestión de canchas
                </p>
              </div>
              <ChevronRight className="h-6 w-6 text-emerald-400" />
            </div>
          </CardContent>
        </Card>

        {/* Info text */}
        <div className="text-center space-y-2 mt-4">
          <p className="text-emerald-400 text-sm">
            ¿Sos jugador? Pedile el link al organizador y abrilo en tu celular.
          </p>
          <p className="text-emerald-600 text-xs">
            El organizador te puede compartir el link por WhatsApp, Instagram o donde quieras.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-emerald-800/50 bg-emerald-950/20 py-3 text-center">
        <p className="text-emerald-600 text-xs">Torneos Relámpago &bull; Gestión Digital</p>
      </footer>
    </div>
  )
}
