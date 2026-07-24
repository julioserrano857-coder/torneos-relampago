import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// GET /api/tournaments/[id] - Get tournament details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data: tournament, error: tournamentError } = await supabase
      .from('Tournament')
      .select('*')
      .eq('id', id)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }

    // Fetch related data
    const { data: teams } = await supabase
      .from('Team')
      .select('*')
      .eq('tournamentId', id)
      .order('seed', { ascending: true })

    const { data: courts } = await supabase
      .from('Court')
      .select('*')
      .eq('tournamentId', id)
      .order('name', { ascending: true })

    const { data: matches } = await supabase
      .from('Match')
      .select('*')
      .eq('tournamentId', id)
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
  } catch (error) {
    console.error('Error fetching tournament:', error)
    return NextResponse.json({ error: 'Failed to fetch tournament' }, { status: 500 })
  }
}

// DELETE /api/tournaments/[id] - Delete tournament
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    // Delete related records first (order matters for foreign keys)
    const { error: matchesError } = await supabase
      .from('Match')
      .delete()
      .eq('tournamentId', id)

    if (matchesError) throw new Error(matchesError.message)

    const { error: teamsError } = await supabase
      .from('Team')
      .delete()
      .eq('tournamentId', id)

    if (teamsError) throw new Error(teamsError.message)

    const { error: courtsError } = await supabase
      .from('Court')
      .delete()
      .eq('tournamentId', id)

    if (courtsError) throw new Error(courtsError.message)

    const { error: tournamentError } = await supabase
      .from('Tournament')
      .delete()
      .eq('id', id)

    if (tournamentError) throw new Error(tournamentError.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tournament:', error)
    return NextResponse.json({ error: 'Failed to delete tournament' }, { status: 500 })
  }
}
