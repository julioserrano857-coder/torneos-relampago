'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getRoundName } from '@/lib/bracket-algorithm'
import type { MatchWithDetails } from '@/lib/types'
import { ArrowLeft, Trophy } from 'lucide-react'

export default function OrganizerBracket() {
  const store = useTournamentStore()
  const { matches } = store

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
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-emerald-400" />
            Cuadro de Llaves
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Bracket - vertical layout for mobile */}
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

        {/* Status indicator */}
        {isActive && (
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-xs">EN JUEGO</span>
          </div>
        )}
        {match.status === 'walkover' && (
          <div className="text-center text-xs text-red-400 mt-1">WALKOVER</div>
        )}
      </CardContent>
    </Card>
  )
}
