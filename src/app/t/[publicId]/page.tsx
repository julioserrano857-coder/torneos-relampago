'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Trophy,
  Search,
  Play,
  Check,
  MessageCircle,
  Share2,
  Link,
  RefreshCw,
  Loader2,
  MapPin,
  Clock,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { getRoundName } from '@/lib/bracket-algorithm'
import type { MatchWithDetails, Team, Tournament, Court } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface TournamentData {
  tournament: Tournament
  teams: Team[]
  courts: Court[]
  matches: MatchWithDetails[]
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function PublicTournamentPage() {
  const params = useParams()
  const publicId = params.publicId as string

  const [data, setData] = useState<TournamentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const tournament = data?.tournament ?? null
  const teams = data?.teams ?? []
  const courts = data?.courts ?? []
  const matches = data?.matches ?? []

  // ─── Data fetching ───────────────────────────────────────────────────────

  const fetchTournament = useCallback(async (showRefresh = false) => {
    if (!publicId) return
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
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

    if (showRefresh) setRefreshing(false)
    else setLoading(false)
  }, [publicId])

  useEffect(() => {
    fetchTournament()
  }, [fetchTournament])

  // Auto refresh every 15 seconds
  useEffect(() => {
    if (!tournament) return
    const interval = setInterval(() => fetchTournament(true), 15000)
    return () => clearInterval(interval)
  }, [tournament, fetchTournament])

  // ─── Computed ─────────────────────────────────────────────────────────────

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return teams.filter(t => t.name.toLowerCase().includes(q))
  }, [teams, searchQuery])

  const teamMatches = useMemo(() => {
    if (!selectedTeam) return []
    return matches.filter(m => m.homeTeamId === selectedTeam.id || m.awayTeamId === selectedTeam.id)
  }, [matches, selectedTeam])

  const nextMatches = useMemo(() => {
    return matches
      .filter(m => m.status === 'pending' && m.homeTeamId && m.awayTeamId)
      .sort((a, b) => a.round - b.round || a.matchNumber - b.matchNumber)
      .slice(0, 8)
  }, [matches])

  const playingMatches = matches.filter(m => m.status === 'playing')
  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  const totalRounds = rounds.length > 0 ? rounds[rounds.length - 1] : 0

  // ─── Share ───────────────────────────────────────────────────────────────

  const getPublicLink = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/t/${publicId}`
  }

  const shareWhatsApp = () => {
    if (!tournament) return
    const link = getPublicLink()
    const text = encodeURIComponent(
      `⚽ *${tournament.name}*\n\n` +
      `📍 ${tournament.location}\n` +
      `📅 ${new Date(tournament.date).toLocaleDateString('es-AR')}\n\n` +
      `Seguí el torneo en vivo:\n${link}\n\n` +
      `🔍 Buscá tu equipo para ver tus partidos!`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareGeneric = () => {
    if (!tournament) return
    const link = getPublicLink()
    if (navigator.share) {
      navigator.share({
        title: tournament.name,
        text: `Seguí el torneo en vivo: ${link}`,
        url: link,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(link)
      toast.success('Link copiado al portapapeles')
    }
  }

  // ─── Loading / Error states ───────────────────────────────────────────────

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
          El link que usaste no corresponde a ningún torneo activo.
          Verificá que el link esté bien o pedile uno nuevo al organizador.
        </p>
        <a href="/" className="text-emerald-300 underline text-sm mt-4">Volver al inicio</a>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950">
      {/* Header */}
      <header className="border-b border-emerald-800 bg-emerald-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <a href={`/t/${publicId}`} className="flex-shrink-0">
              <div className="bg-emerald-600 p-2 rounded-xl">
                <Trophy className="h-6 w-6 text-white" />
              </div>
            </a>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{tournament.name}</h1>
              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{tournament.location}</span>
                <span className="flex-shrink-0">&bull;</span>
                <span className="flex-shrink-0">{new Date(tournament.date).toLocaleDateString('es-AR')}</span>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={shareWhatsApp}
              className="text-green-400 hover:text-green-300 flex-shrink-0" title="Compartir por WhatsApp">
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={shareGeneric}
              className="text-emerald-400 hover:text-white flex-shrink-0" title="Compartir link">
              <Share2 className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => fetchTournament(true)} disabled={refreshing}
              className="text-emerald-400 hover:text-white flex-shrink-0">
              {refreshing ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status banner */}
        {tournament.status === 'active' && (
          <Card className={`border ${playingMatches.length > 0 ? 'bg-emerald-900/50 border-emerald-500' : 'bg-white/5 border-emerald-800'}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${playingMatches.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-yellow-500'}`} />
              <div>
                <p className="text-white font-bold">
                  {playingMatches.length > 0 ? 'Torneo en curso' : 'Torneo activo - esperando partidos'}
                </p>
                <p className="text-emerald-300 text-sm">
                  {playingMatches.length > 0
                    ? `${playingMatches.length} partido(s) en juego ahora`
                    : `${nextMatches.length} partido(s) pendientes`}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
            <CardContent className="p-3 text-center">
              <Users className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{teams.length}</p>
              <p className="text-emerald-400 text-xs">Equipos</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
            <CardContent className="p-3 text-center">
              <Check className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{matches.filter(m => m.status === 'finished' || m.status === 'walkover').length}</p>
              <p className="text-emerald-400 text-xs">Jugados</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
            <CardContent className="p-3 text-center">
              <Clock className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
              <p className="text-xl font-bold text-white">{nextMatches.length}</p>
              <p className="text-emerald-400 text-xs">Pendientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Search team */}
        <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-emerald-400" />
              <h3 className="text-white font-semibold">Buscar mi equipo</h3>
            </div>
            <div className="relative">
              <Input
                placeholder="Escribe el nombre del equipo..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (selectedTeam) setSelectedTeam(null)
                }}
                className="bg-white/10 border-emerald-600 text-white placeholder:text-emerald-500 pl-4"
              />
            </div>

            {filteredTeams.length > 0 && (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {filteredTeams.map(team => (
                  <button key={team.id}
                    onClick={() => { setSelectedTeam(team); setSearchQuery('') }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm transition-colors">
                    {team.name}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Selected team info */}
        {selectedTeam && (
          <TeamInfo
            team={selectedTeam}
            matches={teamMatches}
            allMatches={matches}
            courts={courts}
            onDeselect={() => setSelectedTeam(null)}
          />
        )}

        {/* Now playing */}
        {playingMatches.length > 0 && (
          <section>
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <Play className="h-4 w-4" /> En Juego Ahora
            </h2>
            <div className="space-y-2">
              {playingMatches.map(match => (
                <PublicMatchCard key={match.id} match={match} courts={courts} />
              ))}
            </div>
          </section>
        )}

        {/* Next matches */}
        {nextMatches.length > 0 && (
          <section>
            <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Próximos Partidos
            </h2>
            <div className="space-y-2">
              {nextMatches.map(match => (
                <PublicMatchCard key={match.id} match={match} courts={courts} />
              ))}
            </div>
          </section>
        )}

        {/* Full bracket */}
        <section>
          <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Cuadro de Llaves
          </h2>
          <div className="space-y-6">
            {rounds.map(r => {
              const roundMatches = matches.filter(m => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber)
              return (
                <div key={r}>
                  <h3 className="text-emerald-300 font-semibold text-xs uppercase tracking-wider mb-2">
                    {getRoundName(r, totalRounds)}
                  </h3>
                  <div className="space-y-2">
                    {roundMatches.map(match => (
                      <PublicMatchCard key={match.id} match={match} courts={courts} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Champion */}
        {tournament.status === 'completed' && (() => {
          const finalMatch = matches.find(m => m.round === totalRounds && m.status === 'finished')
          const champion = teams.find(t => t.id === finalMatch?.winnerId)
          return champion ? (
            <Card className="bg-yellow-900/30 border-yellow-600">
              <CardContent className="p-6 text-center">
                <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                <p className="text-yellow-300 text-2xl font-black">{champion.name}</p>
                <p className="text-yellow-400 text-sm mt-1">CAMPEÓN</p>
              </CardContent>
            </Card>
          ) : null
        })()}

        {/* Share banner at bottom */}
        <Card className="bg-emerald-800/30 border-emerald-600/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Share2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-300 text-sm flex-1">
              Compartí este torneo con tus amigos
            </p>
            <Button size="sm" onClick={shareWhatsApp}
              className="bg-green-600 hover:bg-green-500 text-white gap-1">
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-emerald-800/50 bg-emerald-950/20 py-3 text-center">
        <p className="text-emerald-600 text-xs">Torneos Relámpago &bull; Gestión Digital</p>
      </footer>
    </div>
  )
}

// ─── Team Info Sub-Component ──────────────────────────────────────────────────

function TeamInfo({ team, matches, allMatches, courts, onDeselect }: {
  team: Team
  matches: MatchWithDetails[]
  allMatches: MatchWithDetails[]
  courts: Court[]
  onDeselect: () => void
}) {
  const currentMatch = matches.find(m => m.status === 'playing' || m.status === 'pending' || m.status === 'tied')
  const pastMatches = matches.filter(m => m.status === 'finished' || m.status === 'walkover')
  const wins = pastMatches.filter(m => m.winnerId === team.id).length
  const losses = pastMatches.filter(m => m.winnerId !== team.id && m.status === 'finished').length

  return (
    <Card className="bg-emerald-900/30 border-emerald-600">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold text-lg">{team.name}</h3>
          <Button size="sm" variant="ghost" onClick={onDeselect} className="text-emerald-400 hover:text-white">X</Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/5 rounded-lg p-2 text-center">
            <p className="text-white font-bold">{matches.length}</p>
            <p className="text-emerald-400 text-xs">Partidos</p>
          </div>
          <div className="bg-green-600/10 rounded-lg p-2 text-center">
            <p className="text-green-300 font-bold">{wins}</p>
            <p className="text-green-400 text-xs">Ganados</p>
          </div>
          <div className="bg-red-600/10 rounded-lg p-2 text-center">
            <p className="text-red-300 font-bold">{losses}</p>
            <p className="text-red-400 text-xs">Perdidos</p>
          </div>
        </div>

        {currentMatch && (
          <div className="bg-emerald-600/20 rounded-lg p-3">
            <p className="text-emerald-300 text-xs font-medium mb-1">PRÓXIMO / EN JUEGO</p>
            <p className="text-white font-medium">
              {currentMatch.homeTeam?.name || '???'} vs {currentMatch.awayTeam?.name || '???'}
            </p>
            <div className="flex items-center gap-3 mt-1 text-emerald-400 text-xs">
              {currentMatch.courtId && courts.find(c => c.id === currentMatch.courtId) && (
                <span>Cancha: {courts.find(c => c.id === currentMatch.courtId)!.name}</span>
              )}
              <span>Ronda {currentMatch.round}</span>
            </div>
          </div>
        )}

        {pastMatches.length > 0 && (
          <div className="space-y-2">
            <p className="text-emerald-400 text-xs font-medium">HISTORIAL</p>
            {pastMatches.map(match => (
              <div key={match.id} className="bg-white/5 rounded-lg p-2 text-sm flex items-center justify-between">
                <span className="text-white">
                  vs {match.homeTeamId === team.id ? match.awayTeam?.name : match.homeTeam?.name}
                </span>
                <span className={`font-bold ${
                  match.winnerId === team.id ? 'text-green-300' : 'text-red-300'
                }`}>
                  {match.homeTeamId === team.id ? `${match.homeGoals ?? 0}-${match.awayGoals ?? 0}` : `${match.awayGoals ?? 0}-${match.homeGoals ?? 0}`}
                  {match.winnerId === team.id ? ' ✓' : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Public Match Card Sub-Component ────────────────────────────────────────

function PublicMatchCard({ match, courts }: { match: MatchWithDetails; courts: Court[] }) {
  const [expanded, setExpanded] = useState(false)
  const court = courts.find(c => c.id === match.courtId)
  const isPlaying = match.status === 'playing'
  const isFinished = match.status === 'finished' || match.status === 'walkover'

  return (
    <Card className={`backdrop-blur-sm cursor-pointer ${
      isPlaying ? 'bg-emerald-900/50 border-emerald-500' :
      isFinished ? 'bg-white/5 border-green-800/50' :
      'bg-white/10 border-emerald-700'
    }`} onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 space-y-1">
            <div className={`flex items-center justify-between text-sm ${
              match.winnerId === match.homeTeamId ? 'text-green-300 font-bold' : 'text-white'
            }`}>
              <span className="truncate">{match.homeTeam?.name || '???'}</span>
              <span className="font-mono font-bold w-8 text-right">{match.homeGoals ?? ''}</span>
            </div>
            <div className={`flex items-center justify-between text-sm ${
              match.winnerId === match.awayTeamId ? 'text-green-300 font-bold' : 'text-white'
            }`}>
              <span className="truncate">{match.awayTeam?.name || '???'}</span>
              <span className="font-mono font-bold w-8 text-right">{match.awayGoals ?? ''}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {isPlaying && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            {court && (
              <span className="text-emerald-400 text-xs">{court.name}</span>
            )}
          </div>
        </div>

        {expanded && (match.homePenalties !== null || match.awayPenalties !== null || isFinished) && (
          <div className="mt-2 pt-2 border-t border-emerald-800/50 text-xs text-emerald-400 space-y-1">
            {match.homePenalties !== null && (
              <p>Penales: {match.homeTeam?.name} {match.homePenalties} - {match.awayPenalties} {match.awayTeam?.name}</p>
            )}
            {match.status === 'walkover' && (
              <p className="text-red-400">Victoria por Walkover (W.O.)</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
