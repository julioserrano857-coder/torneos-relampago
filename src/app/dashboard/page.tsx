'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Trophy, MapPin, Play, Square, Clock, Swords, Loader2, Zap, RefreshCw, Bell } from 'lucide-react'
import { toast } from 'sonner'
import { getRoundName } from '@/lib/bracket-algorithm'
import type { MatchWithDetails, MatchStatus, Court } from '@/lib/types'

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

export default function DashboardPage() {
  const router = useRouter()
  const store = useTournamentStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMatch, setLoadingMatch] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState(1)
  const [penaltyMatch, setPenaltyMatch] = useState<string | null>(null)
  const [homePen, setHomePen] = useState('')
  const [awayPen, setAwayPen] = useState('')

  const { tournament, matches, courts, teams } = store

  // Load latest active tournament automatically
  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Si ya hay un torneo activo en el store, lo usamos
      let id = store.selectedTournamentId
      if (!id || showRefresh) {
        // Buscar el último torneo no finalizado
        const supabase = createBrowserClient()
        const { data: userData } = await supabase.auth.getUser()
        if (!userData?.user) { setLoading(false); return }

        const { data: tournaments } = await supabase
          .from('Tournament')
          .select('id')
          .eq('organizerId', userData.user.id)
          .neq('status', 'completed')
          .order('createdAt', { ascending: false })
          .limit(1)

        if (!tournaments?.length) {
          store.setSelectedTournamentId(null)
          store.setTournamentData({ tournament: null as any, teams: [], courts: [], matches: [] })
          setLoading(false)
          if (showRefresh) setRefreshing(false)
          return
        }

        id = tournaments[0].id
        store.setSelectedTournamentId(id)
      }

      const res = await fetch(`/api/tournaments/${id}`)
      if (res.ok) {
        const data = await res.json()
        store.setTournamentData({
          tournament: data,
          teams: data.teams || [],
          courts: data.courts || [],
          matches: data.matches || [],
        })
        if (data.matches?.length) setSelectedRound(1)
      }
    } catch {
      toast.error('Error al cargar')
    }

    if (showRefresh) setRefreshing(false)
    else setLoading(false)
  }, [store])

  useEffect(() => { loadData() }, []) // eslint-disable-line

  // Si cambia el selectedTournamentId desde otro lado (ej: Nuevo Torneo), recargamos
  useEffect(() => {
    if (store.selectedTournamentId && (!tournament || tournament.id !== store.selectedTournamentId)) {
      loadData()
    }
  }, [store.selectedTournamentId]) // eslint-disable-line

  // Auto-refresh cada 15s
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 15000)
    return () => clearInterval(interval)
  }, [loadData])

  // ─── Match actions ──────────────────────────────────────────────

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
    } catch {
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
      if (match.homePenalties !== null && match.awayPenalties !== null) {
        if (match.homePenalties === match.awayPenalties) {
          toast.error('Los penales también están empatados')
          return
        }
        const winnerId = match.homePenalties! > match.awayPenalties! ? match.homeTeamId : match.awayTeamId
        updateMatch(match.id, {
          status: 'finished', winnerId,
          finishedAt: new Date().toISOString(), courtId: null,
        })
      } else {
        updateMatch(match.id, { status: 'tied' })
        toast.info('Empate - cargá los penales')
      }
      return
    }
    const winnerId = match.homeGoals! > match.awayGoals! ? match.homeTeamId : match.awayTeamId
    updateMatch(match.id, {
      status: 'finished', winnerId,
      finishedAt: new Date().toISOString(), courtId: null,
    })
  }

  const handleSetGoals = (matchId: string, field: 'homeGoals' | 'awayGoals', value: string) => {
    const num = value === '' ? null : parseInt(value) || 0
    updateMatch(matchId, { [field]: num })
  }

  const handlePenalties = (match: MatchWithDetails) => {
    if (!homePen || !awayPen) {
      toast.error('Cargá los penales')
      return
    }
    const hp = parseInt(homePen), ap = parseInt(awayPen)
    if (hp === ap) { toast.error('Los penales no pueden ser iguales'); return }
    const winnerId = hp > ap ? match.homeTeamId : match.awayTeamId
    updateMatch(match.id, {
      homePenalties: hp, awayPenalties: ap,
      status: 'finished', winnerId,
      finishedAt: new Date().toISOString(), courtId: null,
    })
    setPenaltyMatch(null); setHomePen(''); setAwayPen('')
  }

  const handleWalkover = (match: MatchWithDetails, teamId: string) => {
    updateMatch(match.id, {
      status: 'walkover', winnerId: teamId, walkoverTeamId: teamId,
      finishedAt: new Date().toISOString(), courtId: null,
    })
  }

  // ─── Computed ───────────────────────────────────────────────────

  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  const totalRounds = rounds.length > 0 ? rounds[rounds.length - 1] : 0
  const currentRound = rounds.includes(selectedRound) ? selectedRound : (rounds[0] || 1)

  const roundMatches = matches
    .filter(m => m.round === currentRound)
    .sort((a, b) => a.matchNumber - b.matchNumber)

  const playingMatches = matches.filter(m => m.status === 'playing')

  const getCourtStatus = (court: Court) => {
    const match = playingMatches.find(m => m.courtId === court.id)
    return match || null
  }

  // ─── Empty / No tournament ──────────────────────────────────────

  if (!store.selectedTournamentId) {
    return (
      <div className="px-4 py-16 text-center space-y-4">
        <Swords className="h-16 w-16 text-emerald-700 mx-auto" />
        <h2 className="text-xl font-bold text-white">No hay torneos activos</h2>
        <p className="text-emerald-400 text-sm">
          Creá un torneo desde <strong>Nuevo Torneo</strong>.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="px-4 py-16 text-center space-y-4">
        <Trophy className="h-16 w-16 text-emerald-700 mx-auto" />
        <h2 className="text-xl font-bold text-white">Torneo no encontrado</h2>
        <p className="text-emerald-400 text-sm">Seleccioná otro torneo desde Nuevo Torneo.</p>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Swords className="h-6 w-6 text-emerald-400" />
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">{tournament.name}</h1>
          <div className="flex items-center gap-2 text-emerald-400 text-xs">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{tournament.location}</span>
            {teams.length > 0 && (
              <><span>&bull;</span><span>{teams.length} equipos</span></>
            )}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => loadData(true)} disabled={refreshing}
          className="border-emerald-600 text-emerald-300 hover:bg-emerald-800">
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Court status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {courts.filter(c => c.type === 'main').map(court => {
          const match = getCourtStatus(court)
          return (
            <Card key={court.id} className={`backdrop-blur-sm ${
              match ? 'bg-emerald-900/50 border-emerald-500' : 'bg-green-600/10 border-green-600'
            }`}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <MapPin className={`h-4 w-4 ${match ? 'text-emerald-400' : 'text-green-400'}`} />
                    <span className="font-bold text-white text-sm">{court.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      match ? 'bg-emerald-600 text-white' : 'bg-green-600/30 text-green-300'
                    }`}>
                      {match ? 'EN JUEGO' : 'LIBRE'}
                    </span>
                  </div>
                  {match && (
                    <p className="text-white text-sm mt-1 font-medium">
                      {match.homeTeam?.name} vs {match.awayTeam?.name}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Penalty court status */}
      {courts.filter(c => c.type === 'penalties').map(court => {
        const match = getCourtStatus(court)
        return (
          <Card key={court.id} className="bg-yellow-900/20 border-yellow-600 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400">⚽</span>
                <span className="font-bold text-white text-sm">{court.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  match ? 'bg-yellow-600 text-white' : 'bg-yellow-600/20 text-yellow-300'
                }`}>
                  {match ? 'EN PENALES' : 'LIBRE'}
                </span>
              </div>
              {match && (
                <p className="text-white text-sm mt-1">
                  {match.homeTeam?.name} vs {match.awayTeam?.name}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* Playing now - compact banner */}
      {playingMatches.length > 0 && (
        <div className="bg-emerald-900/50 border border-emerald-500 rounded-lg p-3 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-white font-medium text-sm">
            {playingMatches.length} partido{playingMatches.length > 1 ? 's' : ''} en juego ahora
          </span>
        </div>
      )}

      {/* Round tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {rounds.map(r => (
          <Button key={r} size="sm"
            variant={currentRound === r ? 'default' : 'outline'}
            onClick={() => setSelectedRound(r)}
            className={`whitespace-nowrap ${currentRound === r ? 'bg-emerald-600 text-white' : 'border-emerald-600 text-emerald-300 hover:bg-emerald-800'}`}>
            {getRoundName(r, totalRounds)}
          </Button>
        ))}
      </div>

      {/* Penalty dialog */}
      {penaltyMatch && (() => {
        const m = matches.find(m => m.id === penaltyMatch)
        if (!m) return null
        return (
          <Card className="bg-yellow-900/30 border-yellow-600">
            <CardContent className="p-4 space-y-4">
              <h3 className="text-yellow-300 font-bold flex items-center gap-2">
                <Zap className="h-5 w-5" /> Definición por Penales
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-white text-sm mb-1">{m.homeTeam?.name}</p>
                  <Input type="number" inputMode="numeric" pattern="[0-9]*" min={0} value={homePen}
                    onChange={e => setHomePen(e.target.value)}
                    placeholder="Penales" className="bg-white/10 border-yellow-600 text-white text-center text-2xl h-16"
                    onKeyDown={e => e.key === 'Enter' && handlePenalties(m)} />
                </div>
                <div className="text-center">
                  <p className="text-white text-sm mb-1">{m.awayTeam?.name}</p>
                  <Input type="number" inputMode="numeric" pattern="[0-9]*" min={0} value={awayPen}
                    onChange={e => setAwayPen(e.target.value)}
                    placeholder="Penales" className="bg-white/10 border-yellow-600 text-white text-center text-2xl h-16"
                    onKeyDown={e => e.key === 'Enter' && handlePenalties(m)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setPenaltyMatch(null)}
                  variant="outline" className="flex-1 border-yellow-600 text-yellow-300">Cancelar</Button>
                <Button onClick={() => handlePenalties(m)}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white">Confirmar Ganador</Button>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Match cards */}
      <div className="space-y-3">
        {roundMatches.map(match => (
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
          />
        ))}

        {roundMatches.length === 0 && (
          <div className="text-center py-12 text-emerald-400">
            <p className="text-lg">No hay partidos en esta ronda</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Match Card ───────────────────────────────────────────────────

function MatchCard({ match, courts, allMatches, loading, onStart, onFinish, onSetGoals, onPenalties, onWalkover }: {
  match: MatchWithDetails
  courts: { id: string; name: string; type: string }[]
  allMatches: MatchWithDetails[]
  loading: boolean
  onStart: (match: MatchWithDetails, courtId?: string) => void
  onFinish: (match: MatchWithDetails) => void
  onSetGoals: (matchId: string, field: 'homeGoals' | 'awayGoals', value: string) => void
  onPenalties: () => void
  onWalkover: (match: MatchWithDetails, teamId: string) => void
}) {
  const isPlaying = match.status === 'playing'
  const isFinished = match.status === 'finished' || match.status === 'walkover'
  const isTied = match.status === 'tied'
  const isPending = match.status === 'pending'
  const isReady = match.status === 'ready'
  const isBye = match.status === 'bye'
  const isHomeWinner = match.winnerId === match.homeTeamId
  const isAwayWinner = match.winnerId === match.awayTeamId

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
      isPlaying ? 'bg-emerald-900/50 border-emerald-500 shadow-lg shadow-emerald-900/20' :
      isFinished ? 'bg-white/5 border-green-800' :
      isTied ? 'bg-yellow-900/20 border-yellow-600' :
      'bg-white/10 border-emerald-700'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-emerald-400 text-xs font-medium">Partido #{match.matchNumber}</span>
          <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[match.status]}`}>
            {STATUS_LABELS[match.status]}
          </span>
        </div>

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
                placeholder="-" />
            )}
            {isFinished && (
              <span className="text-2xl font-bold text-white w-16 text-center">{match.homeGoals ?? '-'}</span>
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
                placeholder="-" />
            )}
            {isFinished && (
              <span className="text-2xl font-bold text-white w-16 text-center">{match.awayGoals ?? '-'}</span>
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
            {match.round === 1 ? (
              // Ronda 1: directo a jugar
              <Button onClick={() => onStart(match)} disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 text-base">
                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
                Marcar como &quot;En Juego&quot;
              </Button>
            ) : (
              // Ronda 2+: primero avisar al DJ
              <Button onClick={() => updateMatch(match.id, { status: 'ready' })}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 text-base">
                <Bell className="h-5 w-5 mr-2" /> Listo para llamar
              </Button>
            )}
          </div>
        )}

        {isReady && match.homeTeam && match.awayTeam && (
          <div className="mt-3">
            <Button onClick={() => onStart(match)} disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 text-base">
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Play className="h-5 w-5 mr-2" />}
              Iniciar Partido
            </Button>
          </div>
        )}

        {isPlaying && (
          <div className="mt-3 space-y-2">
            <Button onClick={() => onFinish(match)} disabled={loading}
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

        {isPending && match.homeTeam && match.awayTeam && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button size="sm" variant="outline" onClick={() => onWalkover(match, match.homeTeamId!)}
              className="border-emerald-600 text-emerald-300 hover:bg-emerald-800/50 text-xs py-3">
              Ganador {match.homeTeam?.name}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onWalkover(match, match.awayTeamId!)}
              className="border-emerald-600 text-emerald-300 hover:bg-emerald-800/50 text-xs py-3">
              Ganador {match.awayTeam?.name}
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
