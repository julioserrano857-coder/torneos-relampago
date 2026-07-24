'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  Play,
  Square,
  Trophy,
  AlertTriangle,
  Minus,
  RefreshCw,
  Clock,
  Loader2,
  Zap,
  Swords,
} from 'lucide-react'
import { toast } from 'sonner'
import { getRoundName } from '@/lib/bracket-algorithm'
import type { MatchWithDetails, MatchStatus } from '@/lib/types'

const STATUS_COLORS: Record<MatchStatus, string> = {
  pending: 'bg-gray-600/20 text-gray-300 border-gray-600',
  ready: 'bg-blue-600/20 text-blue-300 border-blue-600',
  playing: 'bg-emerald-600/20 text-emerald-300 border-emerald-600',
  tied: 'bg-yellow-600/20 text-yellow-300 border-yellow-600',
  finished: 'bg-green-600/20 text-green-300 border-green-600',
  bye: 'bg-purple-600/20 text-purple-300 border-purple-600',
  walkover: 'bg-red-600/20 text-red-300 border-red-600',
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  pending: 'Pendiente',
  ready: 'Listo',
  playing: 'En Juego',
  tied: 'Empatado',
  finished: 'Finalizado',
  bye: 'BYE',
  walkover: 'W.O.',
}

export default function OrganizerMatches() {
  const store = useTournamentStore()
  const [loadingMatch, setLoadingMatch] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<number>(1)
  const [penaltyMatch, setPenaltyMatch] = useState<string | null>(null)
  const [homePen, setHomePen] = useState('')
  const [awayPen, setAwayPen] = useState('')

  const { tournament, matches, courts } = store

  const rounds = useMemo(() => {
    const roundNums = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
    const totalRounds = roundNums.length > 0 ? roundNums[roundNums.length - 1] : 0
    return roundNums.map(r => ({
      number: r,
      name: getRoundName(r, totalRounds),
      matches: matches.filter(m => m.round === r),
    }))
  }, [matches])

  const currentRound = rounds.find(r => r.number === selectedRound) || rounds[0]

  const updateMatch = async (matchId: string, data: Record<string, any>) => {
    setLoadingMatch(matchId)
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const updated = await res.json()
        store.updateMatch(updated)
        toast.success('Partido actualizado')
      } else {
        toast.error('Error al actualizar')
      }
    } catch (err) {
      toast.error('Error de conexión')
    }
    setLoadingMatch(null)
  }

  const handleStartMatch = (match: MatchWithDetails, courtId?: string) => {
    const mainCourts = courts.filter(c => c.type === 'main')
    const freeCourt = courtId || mainCourts.find(c => 
      !matches.some(m => m.courtId === c.id && m.status === 'playing')
    )?.id

    updateMatch(match.id, {
      status: 'playing',
      courtId: freeCourt || null,
      startedAt: new Date().toISOString(),
    })
  }

  const handleFinishMatch = (match: MatchWithDetails) => {
    if (match.homeGoals === null || match.awayGoals === null) {
      toast.error('Carga los goles primero')
      return
    }
    if (match.homeGoals === match.awayGoals) {
      // Need penalties or it's still tied
      if (match.homePenalties !== null && match.awayPenalties !== null) {
        if (match.homePenalties === match.awayPenalties) {
          toast.error('Los penales también están empatados')
          return
        }
        const winnerId = match.homePenalties! > match.awayPenalties! ? match.homeTeamId : match.awayTeamId
        updateMatch(match.id, {
          status: 'finished',
          winnerId,
          finishedAt: new Date().toISOString(),
          courtId: null,
        })
      } else {
        updateMatch(match.id, { status: 'tied' })
        toast.info('Empate - carga los penales')
      }
      return
    }
    const winnerId = match.homeGoals! > match.awayGoals! ? match.homeTeamId : match.awayTeamId
    updateMatch(match.id, {
      status: 'finished',
      winnerId,
      finishedAt: new Date().toISOString(),
      courtId: null,
    })
  }

  const handleSetGoals = (matchId: string, field: 'homeGoals' | 'awayGoals', value: string) => {
    const num = value === '' ? null : parseInt(value) || 0
    updateMatch(matchId, { [field]: num })
  }

  const handlePenalties = (match: MatchWithDetails) => {
    if (!homePen || !awayPen) {
      toast.error('Carga los penales')
      return
    }
    const hp = parseInt(homePen)
    const ap = parseInt(awayPen)
    if (hp === ap) {
      toast.error('Los penales no pueden ser iguales')
      return
    }
    const winnerId = hp > ap ? match.homeTeamId : match.awayTeamId
    updateMatch(match.id, {
      homePenalties: hp,
      awayPenalties: ap,
      status: 'finished',
      winnerId,
      finishedAt: new Date().toISOString(),
      courtId: null,
    })
    setPenaltyMatch(null)
    setHomePen('')
    setAwayPen('')
  }

  const handleWalkover = (match: MatchWithDetails, teamId: string) => {
    updateMatch(match.id, {
      status: 'walkover',
      winnerId: teamId,
      walkoverTeamId: teamId,
      finishedAt: new Date().toISOString(),
      courtId: null,
    })
  }

  const handleConfirmWinner = (match: MatchWithDetails, teamId: string) => {
    updateMatch(match.id, {
      status: 'finished',
      winnerId: teamId,
      finishedAt: new Date().toISOString(),
      courtId: null,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950">
      {/* Header */}
      <header className="border-b border-emerald-800 bg-emerald-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => store.setCurrentView('organizer-dashboard')}
            className="text-emerald-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Swords className="h-5 w-5 text-emerald-400" />
              Mesa de Control
            </h1>
          </div>
          <Button size="sm" variant="outline" onClick={() => {
            // Refresh data
            fetch(`/api/tournaments/${store.selectedTournamentId}`)
              .then(r => r.json())
              .then(data => store.setTournamentData({
                tournament: data, teams: data.teams || [],
                courts: data.courts || [], matches: data.matches || [],
              }))
          }} className="border-emerald-600 text-emerald-300 hover:bg-emerald-800">
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Round Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {rounds.map(r => (
            <Button key={r.number} size="sm"
              variant={selectedRound === r.number ? 'default' : 'outline'}
              onClick={() => setSelectedRound(r.number)}
              className={`whitespace-nowrap ${selectedRound === r.number ? 'bg-emerald-600 text-white' : 'border-emerald-600 text-emerald-300 hover:bg-emerald-800'}`}>
              {r.name}
            </Button>
          ))}
        </div>

        {/* Penalty Dialog */}
        {penaltyMatch && (
          <Card className="bg-yellow-900/30 border-yellow-600">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-yellow-300 font-bold flex items-center gap-2">
                <Zap className="h-5 w-5" /> Definición por Penales
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-white text-sm mb-1">{matches.find(m => m.id === penaltyMatch)?.homeTeam?.name}</p>
                  <Input type="number" inputMode="numeric" pattern="[0-9]*" min={0} value={homePen} onChange={e => setHomePen(e.target.value)}
                    placeholder="Penales" className="bg-white/10 border-yellow-600 text-white text-center text-2xl h-16"
                    onKeyDown={e => e.key === 'Enter' && handlePenalties(matches.find(m => m.id === penaltyMatch)!)} />
                </div>
                <div className="text-center">
                  <p className="text-white text-sm mb-1">{matches.find(m => m.id === penaltyMatch)?.awayTeam?.name}</p>
                  <Input type="number" inputMode="numeric" pattern="[0-9]*" min={0} value={awayPen} onChange={e => setAwayPen(e.target.value)}
                    placeholder="Penales" className="bg-white/10 border-yellow-600 text-white text-center text-2xl h-16"
                    onKeyDown={e => e.key === 'Enter' && handlePenalties(matches.find(m => m.id === penaltyMatch)!)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setPenaltyMatch(null)}
                  variant="outline" className="flex-1 border-yellow-600 text-yellow-300">Cancelar</Button>
                <Button onClick={() => handlePenalties(matches.find(m => m.id === penaltyMatch)!)}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white">Confirmar Ganador</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matches List */}
        {currentRound?.matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            courts={courts}
            allMatches={matches}
            loading={loadingMatch === match.id}
            onStart={handleStartMatch}
            onFinish={handleFinishMatch}
            onSetGoals={handleSetGoals}
            onPenalties={() => setPenaltyMatch(match.id)}
            onWalkover={handleWalkover}
            onConfirmWinner={handleConfirmWinner}
          />
        ))}

        {currentRound?.matches.length === 0 && (
          <div className="text-center py-12 text-emerald-400">
            <p className="text-lg">No hay partidos en esta ronda</p>
          </div>
        )}
      </main>
    </div>
  )
}

interface MatchCardProps {
  match: MatchWithDetails
  courts: { id: string; name: string; type: string }[]
  allMatches: MatchWithDetails[]
  loading: boolean
  onStart: (match: MatchWithDetails, courtId?: string) => void
  onFinish: (match: MatchWithDetails) => void
  onSetGoals: (matchId: string, field: 'homeGoals' | 'awayGoals', value: string) => void
  onPenalties: () => void
  onWalkover: (match: MatchWithDetails, teamId: string) => void
  onConfirmWinner: (match: MatchWithDetails, teamId: string) => void
}

function MatchCard({ match, courts, allMatches, loading, onStart, onFinish, onSetGoals, onPenalties, onWalkover, onConfirmWinner }: MatchCardProps) {
  const isPlaying = match.status === 'playing'
  const isFinished = match.status === 'finished' || match.status === 'walkover'
  const isTied = match.status === 'tied'
  const isPending = match.status === 'pending'
  const isBye = match.status === 'bye'

  const isHomeWinner = match.winnerId === match.homeTeamId
  const isAwayWinner = match.winnerId === match.awayTeamId

  return (
    <Card className={`backdrop-blur-sm ${isPlaying ? 'bg-emerald-900/50 border-emerald-500 shadow-lg shadow-emerald-900/20' :
      isFinished ? 'bg-white/5 border-green-800' :
      isTied ? 'bg-yellow-900/20 border-yellow-600' :
      'bg-white/10 border-emerald-700'
    }`}>
      <CardContent className="p-4">
        {/* Match header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-emerald-400 text-xs font-medium">Partido #{match.matchNumber}</span>
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[match.status]}`}>
            {STATUS_LABELS[match.status]}
          </span>
        </div>

        {/* Teams and scores */}
        <div className="space-y-2">
          {/* Home Team */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${isHomeWinner ? 'bg-green-600/20 border border-green-600' : 'bg-white/5'}`}>
            <span className={`flex-1 font-semibold ${isHomeWinner ? 'text-green-300' : match.homeTeam?.name ? 'text-white' : 'text-gray-500'}`}>
              {match.homeTeam?.name || 'Por definir'}
            </span>
            {(isPending || isPlaying || isTied) && match.homeTeam && (
              <Input type="number" inputMode="numeric" pattern="[0-9]*" min={0} max={99}
                defaultValue={match.homeGoals ?? ''}
                onChange={e => onSetGoals(match.id, 'homeGoals', e.target.value)}
                className="w-16 h-12 text-center text-xl font-bold bg-white/10 border-emerald-600 text-white"
                placeholder="-"
              />
            )}
            {isFinished && (
              <span className="text-2xl font-bold text-white w-16 text-center">
                {match.homeGoals ?? '-'}
              </span>
            )}
          </div>

          {/* Away Team */}
          <div className={`flex items-center gap-3 p-3 rounded-lg ${isAwayWinner ? 'bg-green-600/20 border border-green-600' : 'bg-white/5'}`}>
            <span className={`flex-1 font-semibold ${isAwayWinner ? 'text-green-300' : match.awayTeam?.name ? 'text-white' : 'text-gray-500'}`}>
              {match.awayTeam?.name || 'Por definir'}
            </span>
            {(isPending || isPlaying || isTied) && match.awayTeam && (
              <Input type="number" inputMode="numeric" pattern="[0-9]*" min={0} max={99}
                defaultValue={match.awayGoals ?? ''}
                onChange={e => onSetGoals(match.id, 'awayGoals', e.target.value)}
                className="w-16 h-12 text-center text-xl font-bold bg-white/10 border-emerald-600 text-white"
                placeholder="-"
              />
            )}
            {isFinished && (
              <span className="text-2xl font-bold text-white w-16 text-center">
                {match.awayGoals ?? '-'}
              </span>
            )}
          </div>

          {/* Penalties indicator */}
          {(isFinished || isTied) && match.homePenalties !== null && match.awayPenalties !== null && (
            <div className="text-center text-sm text-yellow-300">
              Penales: {match.homeTeam?.name} {match.homePenalties} - {match.awayPenalties} {match.awayTeam?.name}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {isPending && match.homeTeam && match.awayTeam && (
          <div className="mt-3 space-y-2">
            <Button onClick={() => onStart(match)}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 text-base">
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
              Marcar como &quot;En Juego&quot;
            </Button>
          </div>
        )}

        {isPlaying && (
          <div className="mt-3 space-y-2">
            <Button onClick={() => onFinish(match)}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white py-5 text-base">
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Square className="h-5 w-5 mr-2" />}
              Cargar Resultado Final
            </Button>
          </div>
        )}

        {isTied && (
          <div className="mt-3">
            <Button onClick={onPenalties}
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-5 text-base">
              <Zap className="h-5 w-5 mr-2" /> Definición por Penales
            </Button>
          </div>
        )}

        {/* Walkover and Confirm Winner for pending matches with teams */}
        {isPending && match.homeTeam && match.awayTeam && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => onWalkover(match, match.homeTeamId!)}
              className="border-red-600 text-red-300 hover:bg-red-900/30 text-xs py-3">
              W.O. {match.homeTeam?.name}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onWalkover(match, match.awayTeamId!)}
              className="border-red-600 text-red-300 hover:bg-red-900/30 text-xs py-3">
              W.O. {match.awayTeam?.name}
            </Button>
          </div>
        )}

        {/* Court indicator */}
        {match.court && (
          <div className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
            <Clock className="h-3 w-3" />
            <span>En {match.court.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
