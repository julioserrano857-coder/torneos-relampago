import { create } from 'zustand'
import type { Tournament, Team, Court, MatchWithDetails, AppView } from '@/lib/types'
import { getRoundName } from '@/lib/bracket-algorithm'

interface TournamentStore {
  // Navigation
  currentView: AppView
  setCurrentView: (view: AppView) => void

  // Auth
  isAuthenticated: boolean
  setAuthenticated: (val: boolean) => void

  // Tournament data
  tournament: Tournament | null
  teams: Team[]
  courts: Court[]
  matches: MatchWithDetails[]
  setTournamentData: (data: {
    tournament: Tournament
    teams: Team[]
    courts: Court[]
    matches: MatchWithDetails[]
  }) => void
  updateMatch: (match: MatchWithDetails) => void

  // Selected tournament for organizer
  selectedTournamentId: string | null
  setSelectedTournamentId: (id: string | null) => void

  // Public view
  publicTournament: Tournament | null
  publicTeams: Team[]
  publicCourts: Court[]
  publicMatches: MatchWithDetails[]
  setPublicTournamentData: (data: {
    tournament: Tournament
    teams: Team[]
    courts: Court[]
    matches: MatchWithDetails[]
  }) => void
  updatePublicMatch: (match: MatchWithDetails) => void

  // Loading
  isLoading: boolean
  setLoading: (val: boolean) => void

  // Socket connection status
  socketConnected: boolean
  setSocketConnected: (val: boolean) => void
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),

  isAuthenticated: false,
  setAuthenticated: (val) => set({ isAuthenticated: val }),

  tournament: null,
  teams: [],
  courts: [],
  matches: [],
  setTournamentData: ({ tournament, teams, courts, matches }) =>
    set({ tournament, teams, courts, matches }),
  updateMatch: (match) =>
    set((state) => ({
      matches: state.matches.map((m) => (m.id === match.id ? match : m)),
    })),

  selectedTournamentId: null,
  setSelectedTournamentId: (id) => set({ selectedTournamentId: id }),

  publicTournament: null,
  publicTeams: [],
  publicCourts: [],
  publicMatches: [],
  setPublicTournamentData: ({ tournament, teams, courts, matches }) =>
    set({ publicTournament: tournament, publicTeams: teams, publicCourts: courts, publicMatches: matches }),
  updatePublicMatch: (match) =>
    set((state) => ({
      publicMatches: state.publicMatches.map((m) => (m.id === match.id ? match : m)),
    })),

  isLoading: false,
  setLoading: (val) => set({ isLoading: val }),

  socketConnected: false,
  setSocketConnected: (val) => set({ socketConnected: val }),
}))
