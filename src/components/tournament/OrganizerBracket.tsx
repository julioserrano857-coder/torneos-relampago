'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getRoundName } from '@/lib/bracket-algorithm'
import type { MatchWithDetails } from '@/lib/types'
import { ArrowLeft, Trophy, RefreshCw, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

export default function OrganizerBracket() {
  const store = useTournamentStore()
  const searchParams = useSearchParams()
  const { matches, tournament } = store
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (showRefresh = false) => {
    const tournamentId = searchParams.get('t') || store.selectedTournamentId
    if (!tournamentId) return

    if (showRefresh) setRefreshing(true)
    else store.setLoading(true)

    store.setSelectedTournamentId(tournamentId)

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`)
      if (res.ok) {
        const data = await res.json()
        store.setTournamentData({
          tournament: data,
          teams: data.teams || [],
          courts: data.courts || [],
          matches: data.matches || [],
        })
      }
    } catch {
      toast.error('Error al cargar')
    }

    if (showRefresh) setRefreshing(false)
    else store.setLoading(false)
  }, [searchParams, store])

  useEffect(() => { loadData() }, []) // eslint-disable-line

  // Auto-refresh cada 15s
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 15000)
    return () => clearInterval(interval)
  }, [loadData])

  const rounds = [...new Set(matches.map(m => m.round))].sort((a, b) => a - b)
  const totalRounds = rounds.length > 0 ? rounds[rounds.length - 1] : 0

  const matchesByRound = rounds.map(r => ({
    number: r,
    name: getRoundName(r, totalRounds),
    matches: matches.filter(m => m.round === r).sort((a, b) => a.matchNumber - b.matchNumber),
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950">
      <header className="border-b border-emerald-800 bg-emerald-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => store.setCurrentView('organizer-dashboard')}
            className="text-emerald-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-white flex items-center gap-2 flex-1">
            <Trophy className="h-5 w-5 text-emerald-400" />
            Cuadro de Llaves
          </h1>
          <Button size="sm" variant="outline" onClick={() => loadData(true)} disabled={refreshing}
            className="border-emerald-600 text-emerald-300 hover:bg-emerald-800">
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {store.isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {!store.isLoading && !tournament && (
          <div className="text-center py-16">
            <Trophy className="h-16 w-16 text-emerald-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white">No hay torneo seleccionado</h2>
            <p className="text-emerald-400 text-sm mt-2">Seleccioná un torneo desde el panel</p>
          </div>
        )}

        {tournament && !store.isLoading && (
          <div className="space-y-8">
            {matchesByRound.map(round => (
              <div key={round.number}>
                <h2 className="text-emerald-400 font-bold text-sm uppercase tracking-wider mb-3 sticky top-14 bg-gradient-to-br from-green-900 to-teal-950 py-1 z-5">
                  {round.name}
                </h2>
                <div className="space-y-3">
                  {round.matches.map(match => (
                    <BracketMatchCard key={match.id} match={match} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function BracketMatchCard({ match }: { match: MatchWithDetails }) {
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
    <Card className={`backdrop-blur-sm transition-colors ${
      isActive ? 'bg-emerald-900/50 border-emerald-500 ring-1 ring-emerald-500/30' :
      isFinished ? 'bg-white/5 border-green-800' :
      match.homeTeamId && match.awayTeamId ? 'bg-white/10 border-emerald-700' :
      'bg-white/5 border-emerald-700/50 opacity-60'
    }`}>
      <CardContent className="p-3 space-y-1">
        {/* Home */}
        <div className={`flex items-center justify-between px-2 py-1.5 rounded ${
          isHomeWinner ? 'bg-green-600/20' : ''
        }`}>
          <span className={`text-sm ${isHomeWinner ? 'text-green-300 font-bold' : match.homeTeam ? 'text-white' : 'text-gray-500'}`}>
            {match.homeTeam?.name || '???'}
          </span>
          <span className={`text-sm font-bold ${
            isHomeWinner ? 'text-green-300' : 'text-gray-400'
          }`}>
            {match.homeGoals ?? ''}
            {isHomeWinner && match.homePenalties !== null && (
              <span className="text-yellow-300 text-xs ml-1">({match.homePenalties})</span>
            )}
          </span>
        </div>
        {/* Divider */}
        <div className="border-t border-emerald-800/50" />
        {/* Away */}
        <div className={`flex items-center justify-between px-2 py-1.5 rounded ${
          isAwayWinner ? 'bg-green-600/20' : ''
        }`}>
          <span className={`text-sm ${isAwayWinner ? 'text-green-300 font-bold' : match.awayTeam ? 'text-white' : 'text-gray-500'}`}>
            {match.awayTeam?.name || '???'}
          </span>
          <span className={`text-sm font-bold ${
            isAwayWinner ? 'text-green-300' : 'text-gray-400'
          }`}>
            {match.awayGoals ?? ''}
            {isAwayWinner && match.awayPenalties !== null && (
              <span className="text-yellow-300 text-xs ml-1">({match.awayPenalties})</span>
            )}
          </span>
        </div>

        {/* Status */}
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
