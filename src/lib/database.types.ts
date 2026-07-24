export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string | null
          email: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          email: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          phone?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      tournaments: {
        Row: {
          id: string
          organizer_id: string
          name: string
          date: string
          location: string
          status: 'setup' | 'active' | 'completed'
          match_time: number
          has_extra_time: boolean
          penalties_per_team: number
          public_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organizer_id: string
          name: string
          date: string
          location: string
          status?: 'setup' | 'active' | 'completed'
          match_time?: number
          has_extra_time?: boolean
          penalties_per_team?: number
          public_id?: string
        }
        Update: {
          name?: string
          date?: string
          location?: string
          status?: 'setup' | 'active' | 'completed'
          match_time?: number
          has_extra_time?: boolean
          penalties_per_team?: number
          updated_at?: string
        }
      }
      teams: {
        Row: {
          id: string
          tournament_id: string
          name: string
          seed: number
          is_bye: boolean
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          seed?: number
          is_bye?: boolean
        }
        Update: {
          name?: string
        }
      }
      courts: {
        Row: {
          id: string
          tournament_id: string
          name: string
          type: 'main' | 'penalties'
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          type: 'main' | 'penalties'
        }
        Update: {
          name?: string
        }
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          round: number
          match_number: number
          court_id: string | null
          home_team_id: string | null
          away_team_id: string | null
          home_goals: number | null
          away_goals: number | null
          home_penalties: number | null
          away_penalties: number | null
          status: 'pending' | 'ready' | 'playing' | 'tied' | 'finished' | 'bye' | 'walkover'
          winner_id: string | null
          walkover_team_id: string | null
          started_at: string | null
          finished_at: string | null
          next_match_id: string | null
          next_match_slot: 'home' | 'away' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          round: number
          match_number: number
          court_id?: string | null
          home_team_id?: string | null
          away_team_id?: string | null
          home_goals?: number | null
          away_goals?: number | null
          home_penalties?: number | null
          away_penalties?: number | null
          status?: 'pending' | 'ready' | 'playing' | 'tied' | 'finished' | 'bye' | 'walkover'
          winner_id?: string | null
          walkover_team_id?: string | null
          started_at?: string | null
          finished_at?: string | null
          next_match_id?: string | null
          next_match_slot?: 'home' | 'away' | null
        }
        Update: {
          court_id?: string | null
          home_goals?: number | null
          away_goals?: number | null
          home_penalties?: number | null
          away_penalties?: number | null
          status?: 'pending' | 'ready' | 'playing' | 'tied' | 'finished' | 'bye' | 'walkover'
          winner_id?: string | null
          walkover_team_id?: string | null
          started_at?: string | null
          finished_at?: string | null
          updated_at?: string
        }
      }
    }
  }
}
