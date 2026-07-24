'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useState } from 'react'
import {
  ArrowLeft,
  MapPin,
  Play,
  Check,
  Clock,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function OrganizerCourts() {
  const store = useTournamentStore()
  const { courts, matches, tournament } = store
  const [loadingCourt, setLoadingCourt] = useState<string | null>(null)

  const getCourtStatus = (courtId: string) => {
    const activeMatch = matches.find(m => m.courtId === courtId && m.status === 'playing')
    if (activeMatch) return { status: 'occupied', match: activeMatch }
    return { status: 'free', match: null }
  }

  const getReadyMatches = () => {
    return matches.filter(m =>
      m.status === 'pending' &&
      m.homeTeamId && m.awayTeamId &&
      !m.courtId
    ).sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round
      return a.matchNumber - b.matchNumber
    })
  }

  const assignMatchToCourt = async (matchId: string, courtId: string) => {
    setLoadingCourt(`${matchId}-${courtId}`)
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courtId,
          status: 'playing',
          startedAt: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        store.updateMatch(updated)
        toast.success('Partido asignado a cancha')
      }
    } catch (err) {
      toast.error('Error al asignar')
    }
    setLoadingCourt(null)
  }

  const finishMatch = async (matchId: string) => {
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          courtId: null,
        }),
      })
      if (res.ok) {
        const updated = await res.json()
        store.updateMatch(updated)
        toast.success('Cancha liberada')
      }
    } catch (err) {
      toast.error('Error')
    }
  }

  const mainCourts = courts.filter(c => c.type === 'main')
  const penaltyCourts = courts.filter(c => c.type === 'penalties')
  const readyMatches = getReadyMatches()

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950">
      <header className="border-b border-emerald-800 bg-emerald-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => store.setCurrentView('organizer-dashboard')}
            className="text-emerald-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-400" />
            Gestión de Canchas
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Courts */}
        <div className="space-y-4">
          <h2 className="text-white font-semibold text-lg">Canchas</h2>
          {mainCourts.map(court => {
            const { status, match } = getCourtStatus(court.id)
            return (
              <Card key={court.id} className={`backdrop-blur-sm ${
                status === 'occupied' ? 'bg-emerald-900/50 border-emerald-500' : 'bg-green-600/10 border-green-600'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-emerald-400" />
                      <span className="font-bold text-white text-lg">{court.name}</span>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                      status === 'occupied' ? 'bg-emerald-600 text-white' : 'bg-green-600/30 text-green-300'
                    }`}>
                      {status === 'occupied' ? 'OCUPADA' : 'LIBRE'}
                    </span>
                  </div>

                  {status === 'occupied' && match && (
                    <div className="bg-white/5 rounded-lg p-4 space-y-3">
                      <p className="text-white font-medium">
                        {match.homeTeam?.name} vs {match.awayTeam?.name}
                      </p>
                      <div className="flex items-center gap-2 text-emerald-400 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>En juego - Ronda {match.round}, Partido #{match.matchNumber}</span>
                      </div>
                      <Button size="sm" variant="outline"
                        onClick={() => finishMatch(match.id)}
                        className="border-red-600 text-red-300 hover:bg-red-900/30">
                        Finalizar y liberar cancha
                      </Button>
                    </div>
                  )}

                  {status === 'free' && (
                    <div className="space-y-2">
                      <p className="text-green-300 text-sm">Cancha disponible - Asignar partido:</p>
                      {readyMatches.slice(0, 3).map(match => (
                        <div key={match.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-3">
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">
                              {match.homeTeam?.name} vs {match.awayTeam?.name}
                            </p>
                            <p className="text-emerald-400 text-xs">Ronda {match.round}, #${match.matchNumber}</p>
                          </div>
                          <Button size="sm" onClick={() => assignMatchToCourt(match.id, court.id)}
                            disabled={loadingCourt === `${match.id}-${court.id}`}
                            className="bg-green-600 hover:bg-green-500 text-white">
                            {loadingCourt === `${match.id}-${court.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                      {readyMatches.length === 0 && (
                        <p className="text-gray-400 text-sm">No hay partidos listos para asignar</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Penalty Stations */}
        {penaltyCourts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-white font-semibold text-lg">Estación de Penales</h2>
            {penaltyCourts.map(court => (
              <Card key={court.id} className="bg-yellow-900/20 border-yellow-600 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400">⚽</span>
                    <span className="font-bold text-white">{court.name}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Ready Matches Queue */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <Play className="h-5 w-5 text-emerald-400" />
            Cola de Partidos ({readyMatches.length})
          </h2>
          {readyMatches.map(match => (
            <Card key={match.id} className="bg-white/10 border-emerald-700 backdrop-blur-sm">
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">
                    {match.homeTeam?.name} vs {match.awayTeam?.name}
                  </p>
                  <p className="text-emerald-400 text-xs">Ronda {match.round}, #{match.matchNumber}</p>
                </div>
                <div className="flex gap-1">
                  {mainCourts.map(court => {
                    const courtStatus = getCourtStatus(court.id)
                    return (
                      <Button key={court.id} size="sm" variant="outline"
                        disabled={courtStatus.status === 'occupied' || loadingCourt === `${match.id}-${court.id}`}
                        onClick={() => assignMatchToCourt(match.id, court.id)}
                        className={`text-xs border-emerald-600 text-emerald-300 hover:bg-emerald-800 ${
                          courtStatus.status === 'occupied' ? 'opacity-50' : ''
                        }`}>
                        {court.name.split(' ').pop()}
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
