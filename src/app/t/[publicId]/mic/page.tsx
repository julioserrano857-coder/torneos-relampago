'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Mic, Trophy, MapPin, Users, Loader2 } from 'lucide-react'
import type { MatchWithDetails, Team, Tournament, Court } from '@/lib/types'

interface TournamentData {
  tournament: Tournament
  teams: Team[]
  courts: Court[]
  matches: MatchWithDetails[]
}

export default function PublicMicPage() {
  const params = useParams()
  const publicId = params.publicId as string

  const [data, setData] = useState<TournamentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(new Date())

  const tournament = data?.tournament ?? null
  const teams = data?.teams ?? []
  const courts = data?.courts ?? []
  const matches = data?.matches ?? []

  const fetchTournament = useCallback(async () => {
    if (!publicId) return
    setError(null)
    try {
      const res = await fetch(`/api/tournaments?publicId=${publicId}`)
      if (res.ok) {
        const json = await res.json()
        setData({
          tournament: json,
          teams: json.teams || [],
          courts: json.courts || [],
          matches: json.matches || [],
        })
      } else {
        setError('Torneo no encontrado')
      }
    } catch {
      setError('Error al cargar')
    }
    setLoading(false)
  }, [publicId])

  useEffect(() => { fetchTournament() }, [fetchTournament])

  // Reloj
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Auto-refresh
  useEffect(() => {
    if (!tournament) return
    const interval = setInterval(() => fetchTournament(), 15000)
    return () => clearInterval(interval)
  }, [tournament, fetchTournament])

  // ─── Computed ──────────────────────────────────────────────────

  const playingMatches = matches.filter(m => m.status === 'playing')
  const tiedMatches = matches.filter(m => m.status === 'tied')
  const readyMatches = matches.filter(m =>
    m.status === 'ready' && m.homeTeamId && m.awayTeamId
  )

  const getCourtMatch = (courtId: string) =>
    playingMatches.find(m => m.courtId === courtId) ||
    tiedMatches.find(m => m.courtId === courtId)

  // ─── States ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-red-500 animate-spin" />
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4 p-4">
        <Trophy className="h-16 w-16 text-red-800" />
        <h1 className="text-2xl font-bold text-white text-center">Torneo no encontrado</h1>
        <p className="text-gray-400 text-center">Verificá el link con el organizador.</p>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-red-900 bg-black sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Mic className="h-6 w-6 text-red-500 animate-pulse flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{tournament.name}</h1>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{tournament.location}</span>
              <span>&bull;</span>
              <Users className="h-3 w-3" />
              <span>{teams.length} equipos</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-white text-2xl font-mono font-bold tabular-nums">
              {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {/* AHORA EN CANCHAS */}
        <section>
          <h2 className="text-red-400 font-black text-xl uppercase tracking-wider mb-4 flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            AHORA EN CANCHAS
          </h2>

          {courts.length === 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 text-lg">Sin canchas cargadas</p>
              </CardContent>
            </Card>
          )}

          {courts.map(court => {
            const match = getCourtMatch(court.id)
            const isPenalties = court.type === 'penalties'
            return (
              <Card key={court.id} className={`mb-4 border-2 ${
                match
                  ? isPenalties
                    ? 'bg-yellow-900/20 border-yellow-600'
                    : 'bg-red-900/30 border-red-600 shadow-lg shadow-red-900/20'
                  : 'bg-gray-900 border-gray-800'
              }`}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    {match && <span className="w-4 h-4 rounded-full bg-red-500 animate-pulse" />}
                    <span className={`font-black text-xl ${match ? (isPenalties ? 'text-yellow-400' : 'text-red-400') : 'text-gray-600'}`}>
                      {court.name}
                    </span>
                    <span className={`ml-auto text-sm px-3 py-1 rounded-full font-bold ${
                      match
                        ? isPenalties
                          ? 'bg-yellow-600 text-black'
                          : 'bg-red-600 text-white'
                        : 'bg-gray-800 text-gray-500'
                    }`}>
                      {match ? (isPenalties ? 'PENALES' : 'EN JUEGO') : 'LIBRE'}
                    </span>
                  </div>

                  {match ? (
                    <div className="bg-black/40 rounded-2xl p-8 text-center">
                      <div className="flex items-center justify-center gap-8">
                        <span className="text-white text-3xl font-black">{match.homeTeam?.name || '???'}</span>
                        <span className={`text-5xl font-black ${isPenalties ? 'text-yellow-400' : 'text-red-500'}`}>VS</span>
                        <span className="text-white text-3xl font-black">{match.awayTeam?.name || '???'}</span>
                      </div>
                      <div className="mt-4 text-gray-400 text-sm">
                        Ronda {match.round} &bull; Partido #{match.matchNumber}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-gray-600 text-lg">Disponible</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </section>

        {/* A CONTINUACIÓN */}
        <section>
          <h2 className="text-yellow-400 font-black text-xl uppercase tracking-wider mb-4">
            A CONTINUACIÓN
          </h2>

          {readyMatches.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <p className="text-gray-500 text-lg">No hay partidos listos para llamar</p>
                <p className="text-gray-600 text-sm mt-2">Esperando que el organizador los active</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {readyMatches.map((match, index) => (
                <Card key={match.id} className="bg-yellow-900/20 border-yellow-800">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="bg-yellow-600 text-black font-black text-3xl w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-2xl font-bold">
                          {match.homeTeam?.name}
                        </p>
                        <p className="text-yellow-400 text-xl font-black my-1">VS</p>
                        <p className="text-white text-2xl font-bold">
                          {match.awayTeam?.name}
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          {match.round === 1 ? 'Primera ronda' : `Ronda ${match.round}`} &bull; Partido #{match.matchNumber}
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
