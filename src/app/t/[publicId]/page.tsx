'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy, Search, MapPin, Users, ChevronDown, ChevronUp, RefreshCw, Loader2 } from 'lucide-react'
import { getRoundName } from '@/lib/bracket-algorithm'
import type { MatchWithDetails, Team, Tournament, Court } from '@/lib/types'

interface TournamentData {
  tournament: Tournament
  teams: Team[]
  courts: Court[]
  matches: MatchWithDetails[]
}

export default function PublicTournamentPage() {
  const params = useParams()
  const publicId = params.publicId as string

  const [data, setData] = useState<TournamentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showBracket, setShowBracket] = useState(false)

  const tournament = data?.tournament ?? null
  const teams = data?.teams ?? []
  const courts = data?.courts ?? []
  const matches = data?.matches ?? []

  // ─── Fetch ────────────────────────────────────────────────────

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
      setError('Error al cargar el torneo')
    }
    setLoading(false)
  }, [publicId])

  useEffect(() => { fetchTournament() }, [fetchTournament])

  // Auto-refresh cada 15s
  useEffect(() => {
    if (!tournament) return
    const interval = setInterval(() => fetchTournament(), 15000)
    return () => clearInterval(interval)
  }, [tournament, fetchTournament])

  // ─── Computed ──────────────────────────────────────────────────

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return teams.filter(t => t.name.toLowerCase().includes(q)).slice(0, 8)
  }, [teams, searchQuery])

  const playingMatches = matches.filter(m => m.status === 'playing')
  const tiedMatches = matches.filter(m => m.status === 'tied')

  const nextMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'pending' && m.homeTeamId && m.awayTeamId)
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
      .slice(0, 6)
  }, [matches])

  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  const totalRounds = rounds.length > 0 ? rounds[rounds.length - 1] : 0

  const teamMatches = useMemo(() => {
    if (!selectedTeam) return []
    return matches.filter(m => m.homeTeamId === selectedTeam.id || m.awayTeamId === selectedTeam.id)
  }, [matches, selectedTeam])

  // ─── Loading / Error ───────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex flex-col items-center justify-center gap-4 p-4">
        <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
        <p className="text-emerald-300 text-lg">Cargando torneo...</p>
      </div>
    )
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex flex-col items-center justify-center gap-4 p-4">
        <Trophy className="h-16 w-16 text-emerald-600" />
        <h1 className="text-2xl font-bold text-white text-center">Torneo no encontrado</h1>
        <p className="text-emerald-400 text-center max-w-sm">
          El link no corresponde a ningún torneo activo. Verificá el link o pedile uno nuevo al organizador.
        </p>
        <a href="/" className="text-emerald-300 underline text-sm mt-4">Volver al inicio</a>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 pb-8">
      {/* Header */}
      <header className="border-b border-emerald-800 bg-emerald-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-1.5 rounded-lg flex-shrink-0">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-white font-bold text-base truncate">{tournament.name}</h1>
              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{tournament.location}</span>
                <span>&bull;</span>
                <Users className="h-3 w-3" />
                <span>{teams.length}</span>
              </div>
            </div>
            <button onClick={fetchTournament} className="text-emerald-400 hover:text-white p-1">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Search - compact, always visible */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
            <Input
              placeholder="Buscar equipo..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setSelectedTeam(null) }}
              className="bg-white/10 border-emerald-600 text-white placeholder:text-emerald-500 pl-9 h-9 text-sm"
            />
            {filteredTeams.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-emerald-950 border border-emerald-700 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                {filteredTeams.map(team => (
                  <button key={team.id}
                    onClick={() => { setSelectedTeam(team); setSearchQuery('') }}
                    className="w-full text-left px-3 py-2 text-white text-sm hover:bg-emerald-800 transition-colors">
                    {team.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Selected team info */}
        {selectedTeam && (
          <Card className="bg-emerald-900/50 border-emerald-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-white font-bold">{selectedTeam.name}</h3>
                <button onClick={() => setSelectedTeam(null)} className="text-emerald-400 text-sm">X</button>
              </div>
              {teamMatches.length === 0 ? (
                <p className="text-emerald-300 text-sm">Sin partidos todavía</p>
              ) : (
                <div className="space-y-2">
                  {teamMatches.map(match => (
                    <div key={match.id} className="bg-white/5 rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between text-white">
                        <span>{match.homeTeam?.name}</span>
                        <span className="font-mono font-bold">{match.homeGoals ?? '-'} - {match.awayGoals ?? '-'}</span>
                        <span>{match.awayTeam?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400 text-xs mt-1">
                        <span>{getRoundName(match.round, totalRounds)}</span>
                        {match.court && <span>&bull; {match.court.name}</span>}
                        <span className={`ml-auto ${
                          match.status === 'playing' ? 'text-emerald-400' :
                          match.status === 'finished' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {match.status === 'playing' ? 'EN JUEGO' :
                           match.status === 'finished' ? 'FINALIZADO' :
                           match.status === 'tied' ? 'EMPATE' :
                           match.status === 'walkover' ? 'W.O.' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Ahora en Canchas */}
        {courts.length > 0 && (
          <section>
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Ahora en Canchas
            </h2>
            <div className="space-y-2">
              {courts.map(court => {
                const match = playingMatches.find(m => m.courtId === court.id) ||
                              tiedMatches.find(m => m.courtId === court.id)
                const isPenalties = court.type === 'penalties'
                return (
                  <Card key={court.id} className={`backdrop-blur-sm ${
                    match ? (isPenalties ? 'bg-yellow-900/20 border-yellow-600' : 'bg-emerald-900/50 border-emerald-500') :
                    'bg-white/5 border-emerald-800/50'
                  }`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isPenalties ? 'bg-yellow-600/20' : 'bg-emerald-600/20'
                      }`}>
                        {isPenalties ? <span className="text-yellow-400">⚽</span> : <Trophy className="h-5 w-5 text-emerald-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{court.name}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            match ? (isPenalties ? 'bg-yellow-600 text-white' : 'bg-emerald-600 text-white') :
                            'bg-gray-600/30 text-gray-400'
                          }`}>
                            {match ? (isPenalties ? 'PENALES' : 'EN JUEGO') : 'LIBRE'}
                          </span>
                        </div>
                        {match ? (
                          <p className="text-white text-sm mt-0.5 font-medium">
                            {match.homeTeam?.name} vs {match.awayTeam?.name}
                          </p>
                        ) : (
                          <p className="text-gray-500 text-xs mt-0.5">Sin partido asignado</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </section>
        )}

        {/* En Juego ahora (partidos sin cancha asignada) */}
        {playingMatches.filter(m => !m.courtId).length > 0 && (
          <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3">
            <p className="text-emerald-300 text-sm font-medium">
              {playingMatches.filter(m => !m.courtId).length} partido(s) comenzaron sin cancha asignada
            </p>
          </div>
        )}

        {/* Próximos Partidos */}
        {nextMatches.length > 0 && (
          <section>
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3">
              Próximos Partidos
            </h2>
            <div className="space-y-2">
              {nextMatches.map(match => (
                <Card key={match.id} className="bg-white/10 backdrop-blur-sm border-emerald-700">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {match.homeTeam?.name} vs {match.awayTeam?.name}
                      </p>
                      <p className="text-emerald-400 text-xs mt-0.5">
                        {getRoundName(match.round, totalRounds)} &bull; #{match.matchNumber}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Cuadro de Llaves (acordeón) - desde ronda 2 */}
        {matches.length > 0 && rounds.length > 1 && (
          <section>
            <button
              onClick={() => setShowBracket(!showBracket)}
              className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-emerald-700/50 rounded-lg px-4 py-3 transition-colors"
            >
              <span className="text-white font-semibold text-sm">Cuadro de Llaves</span>
              {showBracket ? <ChevronUp className="h-4 w-4 text-emerald-400" /> : <ChevronDown className="h-4 w-4 text-emerald-400" />}
            </button>

            {showBracket && (
              <div className="mt-3 space-y-6">
                {rounds.filter(r => r > 1).map(r => {
                  const roundMatches = matches
                    .filter(m => m.round === r)
                    .sort((a, b) => a.matchNumber - b.matchNumber)
                  return (
                    <div key={r}>
                      <h3 className="text-emerald-300 font-semibold text-xs uppercase tracking-wider mb-2">
                        {getRoundName(r, totalRounds)}
                      </h3>
                      <div className="space-y-2">
                        {roundMatches.map(match => (
                          <BracketMatchCard key={match.id} match={match} courts={courts} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* Champion banner */}
        {tournament.status === 'completed' && (() => {
          const finalMatch = matches.find(m => m.round === totalRounds && m.status === 'finished')
          const champion = teams.find(t => t.id === finalMatch?.winnerId)
          return champion ? (
            <Card className="bg-gradient-to-br from-yellow-900/40 via-yellow-800/20 to-yellow-900/40 border-yellow-500 shadow-lg shadow-yellow-900/30 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400" />
              <CardContent className="p-8 text-center space-y-4">
                <div className="text-6xl animate-bounce">🏆</div>
                <div>
                  <p className="text-yellow-300 text-xs uppercase tracking-[0.3em] font-bold">Campeón</p>
                  <h2 className="text-yellow-100 text-3xl font-black mt-1">{champion.name}</h2>
                </div>
                <div className="pt-2 text-yellow-600/60 text-[10px] uppercase tracking-wider">
                  {tournament.name} &bull; {new Date(tournament.date).toLocaleDateString('es-AR')}
                </div>
              </CardContent>
            </Card>
          ) : null
        })()}
      </main>
    </div>
  )
}

// ─── Bracket Match Card ─────────────────────────────────────────

function BracketMatchCard({ match, courts }: { match: MatchWithDetails; courts: Court[] }) {
  const isHomeWinner = match.winnerId === match.homeTeamId
  const isAwayWinner = match.winnerId === match.awayTeamId
  const isActive = match.status === 'playing'
  const isFinished = match.status === 'finished' || match.status === 'walkover'
  const isBye = match.status === 'bye'

  if (isBye) {
    return (
      <Card className="bg-purple-900/20 border-purple-700/50">
        <CardContent className="p-3 text-center">
          <p className="text-purple-300 text-sm font-medium">
            BYE - {match.homeTeam?.name} avanza automáticamente
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`backdrop-blur-sm ${
      isActive ? 'bg-emerald-900/50 border-emerald-500 ring-1 ring-emerald-500/30' :
      isFinished ? 'bg-white/5 border-green-800' :
      match.homeTeamId && match.awayTeamId ? 'bg-white/10 border-emerald-700' :
      'bg-white/5 border-emerald-700/50 opacity-60'
    }`}>
      <CardContent className="p-3 space-y-1">
        <div className={`flex items-center justify-between px-2 py-1.5 rounded ${isHomeWinner ? 'bg-green-600/20' : ''}`}>
          <span className={`text-sm ${isHomeWinner ? 'text-green-300 font-bold' : match.homeTeam ? 'text-white' : 'text-gray-500'}`}>
            {match.homeTeam?.name || '???'}
          </span>
          <span className={`text-sm font-bold ${isHomeWinner ? 'text-green-300' : 'text-gray-400'}`}>
            {match.homeGoals ?? ''}
            {isHomeWinner && match.homePenalties !== null && (
              <span className="text-yellow-300 text-xs ml-1">({match.homePenalties})</span>
            )}
          </span>
        </div>
        <div className="border-t border-emerald-800/50" />
        <div className={`flex items-center justify-between px-2 py-1.5 rounded ${isAwayWinner ? 'bg-green-600/20' : ''}`}>
          <span className={`text-sm ${isAwayWinner ? 'text-green-300 font-bold' : match.awayTeam ? 'text-white' : 'text-gray-500'}`}>
            {match.awayTeam?.name || '???'}
          </span>
          <span className={`text-sm font-bold ${isAwayWinner ? 'text-green-300' : 'text-gray-400'}`}>
            {match.awayGoals ?? ''}
            {isAwayWinner && match.awayPenalties !== null && (
              <span className="text-yellow-300 text-xs ml-1">({match.awayPenalties})</span>
            )}
          </span>
        </div>
        {isActive && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-xs">EN JUEGO</span>
          </div>
        )}
        {match.status === 'walkover' && (
          <div className="text-center text-xs text-red-400 mt-1">W.O.</div>
        )}
      </CardContent>
    </Card>
  )
}
