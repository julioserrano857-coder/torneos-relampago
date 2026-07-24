'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useState, useMemo, useEffect } from 'react'
import {
  ArrowLeft,
  Trophy,
  Search,
  Users,
  Clock,
  MapPin,
  Play,
  Check,
  Share2,
  MessageCircle,
  Link,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getRoundName } from '@/lib/bracket-algorithm'
import type { MatchWithDetails, Team } from '@/lib/types'

export default function PublicView() {
  const store = useTournamentStore()
  const { publicTournament: tournament, publicTeams: teams, publicCourts: courts, publicMatches: matches } = store
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  const refreshData = async () => {
    if (!tournament?.publicId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tournaments?publicId=${tournament.publicId}`)
      if (res.ok) {
        const data = await res.json()
        store.setPublicTournamentData({
          tournament: data,
          teams: data.teams || [],
          courts: data.courts || [],
          matches: data.matches || [],
        })
      }
    } catch (err) {
      toast.error('Error al actualizar')
    }
    setLoading(false)
  }

  // Auto refresh every 15 seconds
  useEffect(() => {
    const interval = setInterval(refreshData, 15000)
    return () => clearInterval(interval)
  }, [tournament?.publicId])

  const shareWhatsApp = () => {
    if (!tournament) return
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${base}/?t=${tournament.publicId}`
    const text = encodeURIComponent(
      `⚽ *${tournament.name}*

` +
      `Seguí el torneo en vivo:
${link}

` +
      `🔍 Buscá tu equipo para ver tus partidos!`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex flex-col items-center justify-center gap-4 p-4">
        <Trophy className="h-12 w-12 text-emerald-500" />
        <p className="text-white text-lg">Cargando torneo...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950">
      {/* Header */}
      <header className="border-b border-emerald-800 bg-emerald-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              store.setPublicTournamentData({ tournament: null as any, teams: [], courts: [], matches: [] })
              store.setCurrentView('home')
            }}
              className="text-emerald-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{tournament.name}</h1>
              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{tournament.location}</span>
                <span>&bull;</span>
                <span>{new Date(tournament.date).toLocaleDateString('es-AR')}</span>
              </div>
            </div>
            <Button size="icon" variant="ghost" onClick={shareWhatsApp}
              className="text-green-400 hover:text-green-300" title="Compartir por WhatsApp">
                <MessageCircle className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" onClick={refreshData} disabled={loading}
                className="text-emerald-400 hover:text-white">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Status banner */}
        {tournament.status === 'active' && playingMatches.length > 0 && (
          <Card className="bg-emerald-900/50 border-emerald-500">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-white font-bold">Torneo en curso</p>
                <p className="text-emerald-300 text-sm">{playingMatches.length} partido(s) en juego ahora</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
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

            {/* Search results */}
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
      </main>
    </div>
  )
}

function TeamInfo({ team, matches, allMatches, courts, onDeselect }: {
  team: Team
  matches: MatchWithDetails[]
  allMatches: MatchWithDetails[]
  courts: { id: string; name: string; type: string }[]
  onDeselect: () => void
}) {
  const currentMatch = matches.find(m => m.status === 'playing' || m.status === 'pending' || m.status === 'tied')
  const nextMatch = matches.find(m => m.status === 'pending' && m.homeTeamId && m.awayTeamId && m.round > (currentMatch?.round || 0))
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
              {currentMatch.homeTeam?.name} vs {currentMatch.awayTeam?.name}
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
                  {match.homeTeamId === team.id ? `${match.homeGoals}-${match.awayGoals}` : `${match.awayGoals}-${match.homeGoals}`}
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

function PublicMatchCard({ match, courts }: { match: MatchWithDetails; courts: { id: string; name: string; type: string }[] }) {
  const [expanded, setExpanded] = useState(false)
  const court = courts.find(c => c.id === match.courtId)
  const isPlaying = match.status === 'playing'
  const isFinished = match.status === 'finished' || match.status === 'walkover'
  const isTied = match.status === 'tied'

  return (
    <Card className={`backdrop-blur-sm cursor-pointer ${
      isPlaying ? 'bg-emerald-900/50 border-emerald-500' :
      isFinished ? 'bg-white/5 border-green-800/50' :
      'bg-white/10 border-emerald-700'
    }`} onClick={() => setExpanded(!expanded)}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Teams */}
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

          {/* Status */}
          <div className="flex flex-col items-end gap-1">
            {isPlaying && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
            {court && (
              <span className="text-emerald-400 text-xs">{court.name}</span>
            )}
          </div>
        </div>

        {/* Expanded details */}
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
