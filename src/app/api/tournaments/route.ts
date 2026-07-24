import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { generateBracketSeeds, nextPowerOf2, calculateByes } from '@/lib/bracket-algorithm'

// POST /api/tournaments - Create a new tournament
export async function POST(request: Request) {
  try {
    // Get authenticated user from cookies
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const cookieHeader = request.headers.get('cookie') || ''
            return cookieHeader.split('; ').filter(Boolean).map(c => {
              const [name, ...rest] = c.split('=')
              return { name, value: rest.join('=') }
            })
          },
          setAll() {},
        },
      }
    )
    const { data: { user } } = await supabaseAuth.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, date, location, matchTime, hasExtraTime, penaltiesPerTeam, password, teamNames, courtNames } = body

    // Generate a public ID
    const publicId = Math.random().toString(36).substr(2, 9).toUpperCase()

    const supabase = getSupabaseAdmin()

    const { data: tournament, error: tournamentError } = await supabase
      .from('Tournament')
      .insert({
        organizerId: user.id,
        name,
        date: new Date(date).toISOString(),
        location,
        matchTime: matchTime || 10,
        hasExtraTime: hasExtraTime || false,
        penaltiesPerTeam: penaltiesPerTeam || 5,
        publicId,
        password: password || null,
      })
      .select()
      .single()

    if (tournamentError || !tournament) {
      throw new Error(tournamentError?.message || 'Failed to create tournament')
    }

    // Create courts
    if (courtNames && courtNames.length > 0) {
      for (const courtName of courtNames) {
        const { error: courtError } = await supabase
          .from('Court')
          .insert({
            name: courtName.name,
            type: courtName.type || 'main',
            tournamentId: tournament.id,
          })
          .select()
          .single()

        if (courtError) throw new Error(courtError.message)
      }
    } else {
      // Default courts
      const defaultCourts = [
        { name: 'Cancha 1', type: 'main', tournamentId: tournament.id },
        { name: 'Cancha 2', type: 'main', tournamentId: tournament.id },
        { name: 'Penales', type: 'penalties', tournamentId: tournament.id },
      ]
      for (const court of defaultCourts) {
        const { error: courtError } = await supabase
          .from('Court')
          .insert(court)
          .select()
          .single()

        if (courtError) throw new Error(courtError.message)
      }
    }

    // Create teams and generate bracket
    if (teamNames && teamNames.length > 0) {
      const teams: any[] = []
      for (let i = 0; i < teamNames.length; i++) {
        const { data: team, error: teamError } = await supabase
          .from('Team')
          .insert({
            name: teamNames[i].trim(),
            tournamentId: tournament.id,
            seed: i + 1,
          })
          .select()
          .single()

        if (teamError) throw new Error(teamError.message)
        teams.push(team)
      }

      // Generate bracket matches
      const totalTeams = teams.length
      const np2 = nextPowerOf2(totalTeams)
      const byes = calculateByes(totalTeams)
      const slots = generateBracketSeeds(totalTeams)
      const totalRounds = Math.ceil(Math.log2(np2))
      let firstRoundMatchCount = np2 / 2

      // Create first round matches
      const createdMatches: Record<string, any> = {}
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i]
        const homeTeam = slot.homeSeed ? teams[slot.homeSeed - 1] : null
        const awayTeam = slot.awaySeed ? teams[slot.awaySeed - 1] : null

        const { data: match, error: matchError } = await supabase
          .from('Match')
          .insert({
            tournamentId: tournament.id,
            round: 1,
            matchNumber: i + 1,
            homeTeamId: homeTeam?.id || null,
            awayTeamId: awayTeam?.id || null,
            status: slot.isBye ? 'bye' : 'pending',
            winnerId: slot.isBye ? homeTeam?.id : null,
          })
          .select()
          .single()

        if (matchError) throw new Error(matchError.message)
        createdMatches[`r1m${i + 1}`] = match
      }

      // Create matches for subsequent rounds (empty, waiting for winners)
      let prevRoundMatches = Object.values(createdMatches) as any[]
      let currentMatchCount = firstRoundMatchCount

      for (let r = 2; r <= totalRounds; r++) {
        currentMatchCount = Math.ceil(currentMatchCount / 2)
        const roundMatches: any[] = []

        for (let m = 0; m < currentMatchCount; m++) {
          const { data: match, error: matchError } = await supabase
            .from('Match')
            .insert({
              tournamentId: tournament.id,
              round: r,
              matchNumber: m + 1,
              status: 'pending',
            })
            .select()
            .single()

          if (matchError) throw new Error(matchError.message)
          roundMatches.push(match)
        }

        // Link previous round matches to next round
        for (let m = 0; m < prevRoundMatches.length; m++) {
          const prevMatch = prevRoundMatches[m]
          const nextMatchIndex = Math.floor(m / 2)
          const slot = m % 2 === 0 ? 'home' : 'away'

          const { error: updateError } = await supabase
            .from('Match')
            .update({
              nextMatchId: roundMatches[nextMatchIndex].id,
              nextMatchSlot: slot,
            })
            .eq('id', prevMatch.id)
            .select()
            .single()

          if (updateError) throw new Error(updateError.message)
        }

        prevRoundMatches = roundMatches
      }
    }

    return NextResponse.json(tournament)
  } catch (error) {
    console.error('Error creating tournament:', error)
    return NextResponse.json({ error: 'Failed to create tournament' }, { status: 500 })
  }
}

// GET /api/tournaments - List tournaments
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const publicId = url.searchParams.get('publicId')

    const supabase = getSupabaseAdmin()

    if (publicId) {
      // Query tournament by publicId
      const { data: tournament, error: tournamentError } = await supabase
        .from('Tournament')
        .select('*')
        .eq('publicId', publicId)
        .single()

      if (tournamentError || !tournament) {
        return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
      }

      // Fetch related data
      const { data: teams } = await supabase
        .from('Team')
        .select('*')
        .eq('tournamentId', tournament.id)
        .order('seed', { ascending: true })

      const { data: courts } = await supabase
        .from('Court')
        .select('*')
        .eq('tournamentId', tournament.id)
        .order('name', { ascending: true })

      const { data: matches } = await supabase
        .from('Match')
        .select('*')
        .eq('tournamentId', tournament.id)
        .order('round', { ascending: true })
        .order('matchNumber', { ascending: true })

      // Fetch related entities for each match (homeTeam, awayTeam, court)
      const matchesWithRelations = await Promise.all(
        (matches || []).map(async (match) => {
          let homeTeam = null
          let awayTeam = null
          let court = null

          if (match.homeTeamId) {
            const { data: ht } = await supabase
              .from('Team')
              .select('*')
              .eq('id', match.homeTeamId)
              .single()
            homeTeam = ht
          }

          if (match.awayTeamId) {
            const { data: at } = await supabase
              .from('Team')
              .select('*')
              .eq('id', match.awayTeamId)
              .single()
            awayTeam = at
          }

          if (match.courtId) {
            const { data: c } = await supabase
              .from('Court')
              .select('*')
              .eq('id', match.courtId)
              .single()
            court = c
          }

          return { ...match, homeTeam, awayTeam, court }
        })
      )

      return NextResponse.json({
        ...tournament,
        teams: teams || [],
        courts: courts || [],
        matches: matchesWithRelations,
      })
    }

    // List all tournaments
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('Tournament')
      .select('*')
      .order('createdAt', { ascending: false })

    if (tournamentsError) throw new Error(tournamentsError.message)

    // Fetch teams, courts, and match counts for each tournament
    const result = await Promise.all(
      (tournaments || []).map(async (tournament) => {
        const { data: teams } = await supabase
          .from('Team')
          .select('*')
          .eq('tournamentId', tournament.id)

        const { data: courts } = await supabase
          .from('Court')
          .select('*')
          .eq('tournamentId', tournament.id)

        const { data: matches, count: matchCount } = await supabase
          .from('Match')
          .select('*', { count: 'exact', head: true })
          .eq('tournamentId', tournament.id)

        return {
          ...tournament,
          teams: teams || [],
          courts: courts || [],
          _count: { matches: matchCount || 0 },
        }
      })
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    return NextResponse.json({ error: 'Failed to fetch tournaments' }, { status: 500 })
  }
}
