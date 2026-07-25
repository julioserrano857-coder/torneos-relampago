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

  const { tournament, matches, courts, teams } = store

  // Load latest active tournament automatically
  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      let id = store.selectedTournamentId
      if (!id || showRefresh) {
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
        const err = await res.json()
        toast.error(err.error || 'Error al actualizar')
      }
    } catch {
      toast.error('Error de conexión')
    }
    setLoadingMatch(null)
  }

  const handleStartMatch = (match: MatchWithDetails, courtId?: string) => {
    const mainCourts = courts.filter(c => c.type === 'main')
    const freeCourt = courtId || mainCourts.find(c =>
      !matches.some(m => m.courtId === c.id && (m.status === 'playing' || (m.status === 'tied' && c.type === 'main')))
    )?.id

    updateMatch(match.id, {
      status: 'playing',
      courtId: freeCourt || null,
      startedAt: new Date().toISOString(),
    })
  }

  const handleFinishMatch = (match: MatchWithDetails) => {
    if (match.homeGoals === null || match.awayGoals === null) {
      toast.error('Cargá los goles primero')
      return
    }
    if (match.homeGoals === match.awayGoals) {
      // Empate → pasa a cola de penales, libera cancha
      updateMatch(match.id, { status: 'tied', courtId: null })
      toast.success('Partido empatado - pasa a cola de penales')
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
    const currentMatch = matches.find(m => m.id === matchId)
    if (currentMatch) {
      store.updateMatch({ ...currentMatch, [field]: num })
    }
    fetch(`/api/matches/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: num }),
    }).catch(() => {})
  }

  const handlePenalties = (match: MatchWithDetails, hp: number, ap: number) => {
    if (hp === ap) { toast.error('Los penales no pueden ser iguales'); return }
    const winnerId = hp > ap ? match.homeTeamId : match.awayTeamId
    updateMatch(match.id, {
      homePenalties: hp, awayPenalties: ap,
      status: 'finished', winnerId,
      finishedAt: new Date().toISOString(), courtId: null,
    })
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
  const penaltyCourtId = courts.find(c => c.type === 'penalties')?.id

  // Cola de penales: partidos empatados que no están en la cancha de penales
  const penaltiesQueue = matches
    .filter(m => m.status === 'tied' && (!penaltyCourtId || m.courtId !== penaltyCourtId))
    .sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''))

  // Partido actualmente en penales (asignado a la cancha de penales)
  const playingPenalties = penaltyCourtId
    ? matches.find(m => m.status === 'tied' && m.courtId === penaltyCourtId)
    : null

  const penaltyCourtFree = !playingPenalties

  const getPlayingMatch = (courtId: string) => {
    const court = courts.find(c => c.id === courtId)
    if (court?.type === 'penalties') {
      return playingPenalties || playingMatches.find(m => m.courtId === courtId)
    }
    return playingMatches.find(m => m.courtId === courtId)
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
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="px-4 py-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Swords className="h-5 w-5 text-emerald-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-sm truncate">{tournament.name}</h1>
          <div className="flex items-center gap-1 text-emerald-400 text-[10px]">
            <MapPin className="h-2.5 w-2.5" />
            <span className="truncate">{tournament.location}</span>
            {teams.length > 0 && <><span>·</span><span>{teams.length} eq.</span></>}
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => loadData(true)} disabled={refreshing}
          className="text-emerald-400 hover:text-white h-7 w-7 p-0">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Barra de canchas */}
      <div className="space-y-1">
        {courts.filter(c => c.type === 'main').map(court => {
          const match = getPlayingMatch(court.id)
          return (
            <div key={court.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs ${
              match ? 'bg-emerald-900/50 border border-emerald-500' : 'bg-green-900/10 border border-green-800/30'
            }`}>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${match ? 'bg-emerald-400 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-white font-semibold text-xs">{court.name}</span>
              {match ? (
                <span className="text-white truncate flex-1 text-right">
                  {match.homeTeam?.name} vs {match.awayTeam?.name}
                </span>
              ) : (
                <span className="text-green-400/60 flex-1 text-right">Libre</span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                match ? 'bg-emerald-600 text-white' : 'bg-green-600/20 text-green-400'
              }`}>
                {match ? 'EN JUEGO' : 'LIBRE'}
              </span>
            </div>
          )
        })}
        {courts.filter(c => c.type === 'penalties').map(court => {
          const match = getPlayingMatch(court.id)
          return (
            <div key={court.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs ${
              match ? 'bg-yellow-900/30 border border-yellow-600' : 'bg-yellow-900/10 border border-yellow-800/30'
            }`}>
              <span className="flex-shrink-0">⚽</span>
              <span className="text-white font-semibold text-xs">{court.name}</span>
              {match ? (
                <span className="text-white truncate flex-1 text-right">
                  {match.homeTeam?.name} vs {match.awayTeam?.name}
                </span>
              ) : (
                <span className="text-yellow-400/60 flex-1 text-right">
                  {penaltiesQueue.length > 0 ? `${penaltiesQueue.length} en cola` : 'Libre'}
                </span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                match ? 'bg-yellow-600 text-black' : penaltiesQueue.length > 0 ? 'bg-yellow-600/30 text-yellow-300' : 'bg-yellow-600/20 text-yellow-400'
              }`}>
                {match ? 'PENALES' : penaltiesQueue.length > 0 ? 'ESPERA' : 'LIBRE'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Cola de penales */}
      {penaltiesQueue.length > 0 && (
        <div className="bg-yellow-900/15 border border-yellow-700/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider">Cola de Penales</span>
            <span className="text-yellow-500 text-xs">({penaltiesQueue.length})</span>
          </div>
          {penaltiesQueue.map((m, i) => (
            <div key={m.id} className="flex items-center gap-2">
              <span className="text-yellow-500 text-[10px] w-4">{i + 1}.</span>
              <span className="text-white text-xs flex-1 truncate">{m.homeTeam?.name} vs {m.awayTeam?.name}</span>
              {penaltyCourtFree && i === 0 && (
                <Button size="sm"
                  onClick={() => {
                    const penCourt = courts.find(c => c.type === 'penalties')
                    if (penCourt) updateMatch(m.id, { courtId: penCourt.id })
                  }}
                  className="bg-yellow-600 hover:bg-yellow-500 text-black text-[10px] h-6 px-2 font-bold">
                  Llamar
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pestañas de ronda */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        {rounds.map(r => (
          <button key={r}
            onClick={() => setSelectedRound(r)}
            className={`whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
              currentRound === r
                ? 'bg-emerald-600 text-white'
                : 'bg-white/5 text-emerald-400 hover:bg-white/10'
            }`}>
            {getRoundName(r, totalRounds)}
          </button>
        ))}
      </div>

      {/* Cards de partidos */}
      <div className="space-y-2">
        {roundMatches.map(match => (
          <CompactMatchCard
            key={match.id}
            match={match}
            courts={courts}
            penaltyCourtId={penaltyCourtId}
            loading={loadingMatch === match.id}
            onStart={() => handleStartMatch(match)}
            onFinish={() => handleFinishMatch(match)}
            onSetGoals={(field, value) => handleSetGoals(match.id, field, value)}
            onPenalties={(hp, ap) => handlePenalties(match, hp, ap)}
            onWalkover={(teamId) => handleWalkover(match, teamId)}
            onReady={() => updateMatch(match.id, { status: 'ready' })}
          />
        ))}

        {roundMatches.length === 0 && (
          <div className="text-center py-8 text-emerald-500 text-sm">
            No hay partidos en esta ronda
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Compact Match Card ───────────────────────────────────────────

function CompactMatchCard({ match, courts, penaltyCourtId, loading, onStart, onFinish, onSetGoals, onPenalties, onWalkover, onReady }: {
  match: MatchWithDetails
  courts: { id: string; name: string; type: string }[]
  penaltyCourtId?: string
  loading: boolean
  onStart: () => void
  onFinish: () => void
  onSetGoals: (field: 'homeGoals' | 'awayGoals', value: string) => void
  onPenalties: (hp: number, ap: number) => void
  onWalkover: (teamId: string) => void
  onReady: () => void
}) {
  const isPlaying = match.status === 'playing'
  const isFinished = match.status === 'finished' || match.status === 'walkover'
  const isTied = match.status === 'tied'
  const isPending = match.status === 'pending'
  const isReady = match.status === 'ready'
  const isBye = match.status === 'bye'
  const isHomeWinner = match.winnerId === match.homeTeamId
  const isAwayWinner = match.winnerId === match.awayTeamId
  const isAtPenalties = isTied && penaltyCourtId && match.courtId === penaltyCourtId

  const [homePen, setHomePen] = useState('')
  const [awayPen, setAwayPen] = useState('')

  if (isBye) {
    return (
      <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-3 text-center">
        <p className="text-purple-300 text-xs font-medium">
          BYE — {match.homeTeam?.name} avanza automáticamente
        </p>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${
      isPlaying ? 'bg-emerald-900/50 border-emerald-500 shadow-lg shadow-emerald-900/20' :
      isFinished ? 'bg-white/5 border-green-800/50' :
      isTied ? 'bg-yellow-900/20 border-yellow-600' :
      'bg-white/10 border-emerald-700/50'
    }`}>
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-emerald-400 text-[10px] font-medium">#{match.matchNumber}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[match.status]}`}>
            {isAtPenalties ? 'PENALES' : STATUS_LABELS[match.status]}
          </span>
        </div>

        {/* Equipos + goles */}
        <div className="space-y-1">
          {/* Home */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isHomeWinner ? 'bg-green-600/20' : 'bg-white/5'}`}>
            <span className={`flex-1 text-sm font-medium ${isHomeWinner ? 'text-green-300' : match.homeTeam?.name ? 'text-white' : 'text-gray-500'}`}>
              {match.homeTeam?.name || '???'}
            </span>
            {(isPending || isPlaying) && match.homeTeam && (
              <div className="flex items-center gap-1">
                <button onClick={() => onSetGoals('homeGoals', String(Math.max(0, (match.homeGoals || 0) - 1)))}
                  className="w-6 h-6 rounded bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">-</button>
                <span className="text-white font-bold text-base w-6 text-center tabular-nums">{match.homeGoals ?? 0}</span>
                <button onClick={() => onSetGoals('homeGoals', String((match.homeGoals || 0) + 1))}
                  className="w-6 h-6 rounded bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">+</button>
              </div>
            )}
            {isFinished && (
              <span className="text-white font-bold text-base w-16 text-right">{match.homeGoals ?? '-'}</span>
            )}
            {isAtPenalties && (
              <div className="flex items-center gap-1">
                <input type="number" inputMode="numeric" min={0} value={homePen}
                  onChange={e => setHomePen(e.target.value)}
                  className="w-12 h-8 bg-black/30 border border-yellow-600 rounded text-center text-white font-bold text-sm" />
              </div>
            )}
          </div>

          {/* Away */}
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${isAwayWinner ? 'bg-green-600/20' : 'bg-white/5'}`}>
            <span className={`flex-1 text-sm font-medium ${isAwayWinner ? 'text-green-300' : match.awayTeam?.name ? 'text-white' : 'text-gray-500'}`}>
              {match.awayTeam?.name || '???'}
            </span>
            {(isPending || isPlaying) && match.awayTeam && (
              <div className="flex items-center gap-1">
                <button onClick={() => onSetGoals('awayGoals', String(Math.max(0, (match.awayGoals || 0) - 1)))}
                  className="w-6 h-6 rounded bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">-</button>
                <span className="text-white font-bold text-base w-6 text-center tabular-nums">{match.awayGoals ?? 0}</span>
                <button onClick={() => onSetGoals('awayGoals', String((match.awayGoals || 0) + 1))}
                  className="w-6 h-6 rounded bg-white/10 text-white text-sm flex items-center justify-center hover:bg-white/20">+</button>
              </div>
            )}
            {isFinished && (
              <span className="text-white font-bold text-base w-16 text-right">{match.awayGoals ?? '-'}</span>
            )}
            {isAtPenalties && (
              <div className="flex items-center gap-1">
                <input type="number" inputMode="numeric" min={0} value={awayPen}
                  onChange={e => setAwayPen(e.target.value)}
                  className="w-12 h-8 bg-black/30 border border-yellow-600 rounded text-center text-white font-bold text-sm" />
              </div>
            )}
          </div>

          {/* Penales indicator */}
          {(isFinished || isTied) && match.homePenalties !== null && match.awayPenalties !== null && !isAtPenalties && (
            <div className="text-center text-[10px] text-yellow-300">
              Penales: {match.homeTeam?.name} {match.homePenalties} — {match.awayPenalties} {match.awayTeam?.name}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        {isPending && match.homeTeam && match.awayTeam && (
          <div className="space-y-1.5 pt-1">
            {match.round === 1 ? (
              <Button onClick={onStart} disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 text-sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Marcar como En Juego
              </Button>
            ) : (
              <Button onClick={onReady}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 text-sm">
                <Bell className="h-4 w-4 mr-2" /> Listo para llamar
              </Button>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => onWalkover(match.homeTeamId!)}
                className="text-[10px] py-2 rounded-lg border border-emerald-600/50 text-emerald-300 hover:bg-emerald-800/50 font-medium">
                Ganador {match.homeTeam?.name}
              </button>
              <button onClick={() => onWalkover(match.awayTeamId!)}
                className="text-[10px] py-2 rounded-lg border border-emerald-600/50 text-emerald-300 hover:bg-emerald-800/50 font-medium">
                Ganador {match.awayTeam?.name}
              </button>
            </div>
          </div>
        )}

        {isReady && match.homeTeam && match.awayTeam && (
          <Button onClick={onStart} disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            Iniciar Partido
          </Button>
        )}

        {isPlaying && (
          <Button onClick={onFinish} disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white py-4 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Square className="h-4 w-4 mr-2" />}
            Cargar Resultado Final
          </Button>
        )}

        {isAtPenalties && (
          <Button onClick={() => {
            const hp = parseInt(homePen), ap = parseInt(awayPen)
            if (isNaN(hp) || isNaN(ap)) { toast.error('Cargá los penales de ambos equipos'); return }
            onPenalties(hp, ap)
          }} disabled={loading}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-4 text-sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Confirmar Resultado de Penales
          </Button>
        )}

        {/* Court indicator */}
        {match.court && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <Clock className="h-3 w-3" />
            <span>En {match.court.name}</span>
          </div>
        )}
      </div>
    </div>
  )
}
