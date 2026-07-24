// Shared types for tournament app
export type TournamentStatus = 'setup' | 'active' | 'completed'
export type MatchStatus = 'pending' | 'ready' | 'playing' | 'tied' | 'finished' | 'bye' | 'walkover'
export type CourtType = 'main' | 'penalties'
export type NextMatchSlot = 'home' | 'away'

export interface Tournament {
  id: string
  name: string
  date: string
  location: string
  status: TournamentStatus
  matchTime: number
  hasExtraTime: boolean
  penaltiesPerTeam: number
  publicId: string
  password?: string | null
  createdAt: string
  updatedAt: string
}

export interface Team {
  id: string
  name: string
  tournamentId: string
  seed: number
  isBye: boolean
}

export interface Court {
  id: string
  name: string
  type: CourtType
  tournamentId: string
}

export interface Match {
  id: string
  tournamentId: string
  round: number
  matchNumber: number
  courtId?: string | null
  homeTeamId?: string | null
  awayTeamId?: string | null
  homeGoals?: number | null
  awayGoals?: number | null
  homePenalties?: number | null
  awayPenalties?: number | null
  status: MatchStatus
  winnerId?: string | null
  walkoverTeamId?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  nextMatchId?: string | null
  nextMatchSlot?: NextMatchSlot | null
  createdAt: string
  updatedAt: string
  homeTeam?: Team | null
  awayTeam?: Team | null
  court?: Court | null
}

export interface MatchWithDetails extends Match {
  homeTeam?: Team | null
  awayTeam?: Team | null
  court?: Court | null
}

export interface BracketRound {
  roundNumber: number
  name: string
  matches: MatchWithDetails[]
}

// WebSocket event types
export interface WSMatchUpdate {
  tournamentId: string
  match: MatchWithDetails
  type: 'status' | 'result' | 'court' | 'walkover' | 'reassign'
}

export interface WSTournamentUpdate {
  tournamentId: string
  status: TournamentStatus
  type: 'started' | 'completed' | 'updated'
}

// App navigation
export type AppView = 'home' | 'organizer-login' | 'organizer-dashboard' | 'organizer-create' | 'organizer-matches' | 'organizer-courts' | 'organizer-bracket' | 'organizer-mic'
