'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Mic, Volume2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function OrganizerMic() {
  const store = useTournamentStore()
  const { matches, courts } = store
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const playingMatches = matches.filter(m => m.status === 'playing')
  const readyMatches = matches
    .filter(m => m.status === 'pending' && m.homeTeamId && m.awayTeamId && !m.courtId)
    .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-gray-950 to-black">
      {/* Header */}
      <header className="border-b border-red-800 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => store.setCurrentView('organizer-dashboard')}
            className="text-red-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Mic className="h-6 w-6 text-red-500 animate-pulse" />
              MODO MICRÓFONO
            </h1>
          </div>
          <div className="text-right">
            <p className="text-white text-xl font-mono font-bold">
              {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* NOW PLAYING */}
        <section>
          <h2 className="text-red-400 font-black text-2xl uppercase tracking-wider mb-4 flex items-center gap-3">
            <Volume2 className="h-8 w-8 text-red-500" />
            AHORA EN CANCHA
          </h2>

          {playingMatches.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-8 text-center">
                <p className="text-gray-400 text-xl">Sin partidos en juego</p>
                <p className="text-gray-500 text-sm mt-2">Esperando próximos partidos...</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {playingMatches.map(match => {
                const court = courts.find(c => c.id === match.courtId)
                return (
                  <Card key={match.id} className="bg-red-900/30 border-red-600 shadow-xl shadow-red-900/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-red-400 font-bold text-lg">{court?.name || `Cancha ${match.courtId?.slice(-2)}`}</span>
                      </div>
                      <div className="bg-black/30 rounded-xl p-6 text-center">
                        <div className="flex items-center justify-center gap-6">
                          <span className="text-white text-3xl font-black">{match.homeTeam?.name || '???'}</span>
                          <span className="text-red-400 text-4xl font-black">VS</span>
                          <span className="text-white text-3xl font-black">{match.awayTeam?.name || '???'}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* NEXT UP */}
        <section>
          <h2 className="text-yellow-400 font-black text-xl uppercase tracking-wider mb-4">
            A CONTINUACIÓN (PREPÁRENSE)
          </h2>

          {readyMatches.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-700">
              <CardContent className="p-6 text-center">
                <p className="text-gray-400 text-lg">No hay partidos listos</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {readyMatches.map((match, index) => (
                <Card key={match.id} className="bg-yellow-900/20 border-yellow-700">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="bg-yellow-600 text-black font-black text-2xl w-12 h-12 rounded-full flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div className="flex-1 bg-black/20 rounded-xl p-4">
                        <p className="text-white text-xl font-bold text-center">
                          {match.homeTeam?.name} vs {match.awayTeam?.name}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
