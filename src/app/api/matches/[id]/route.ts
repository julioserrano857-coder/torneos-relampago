import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// PUT /api/matches/[id] - Update match
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = getSupabaseAdmin()

    const { data: match, error: matchError } = await supabase
      .from('Match')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (matchError || !match) {
      throw new Error(matchError?.message || 'Failed to update match')
    }

    // Fetch relations for the response
    let homeTeam = null, awayTeam = null, court = null
    if (match.homeTeamId) {
      const { data: ht } = await supabase.from('Team').select('*').eq('id', match.homeTeamId).single()
      homeTeam = ht
    }
    if (match.awayTeamId) {
      const { data: at } = await supabase.from('Team').select('*').eq('id', match.awayTeamId).single()
      awayTeam = at
    }
    if (match.courtId) {
      const { data: c } = await supabase.from('Court').select('*').eq('id', match.courtId).single()
      court = c
    }

    const matchWithDetails = { ...match, homeTeam, awayTeam, court }

    // If match finished with a winner, advance to next round
    if (body.status === 'finished' && body.winnerId) {
      const { data: tournament } = await supabase
        .from('Tournament')
        .select('*, matches:Match(*)')
        .eq('id', match.tournamentId)
        .single()

      if (tournament) {
        const tournamentMatches = tournament.matches || []
        const maxRound = Math.max(...tournamentMatches.map((m: any) => m.round), 0)

        if (match.round < maxRound) {
          // Find the correct next match by nextMatchId
          if (match.nextMatchId) {
            const slot = match.nextMatchSlot === 'home' ? 'homeTeamId' : 'awayTeamId'
            await supabase
              .from('Match')
              .update({ [slot]: body.winnerId })
              .eq('id', match.nextMatchId)

            // Check if next match now has both teams
            const { data: updatedNextMatch } = await supabase
              .from('Match')
              .select('*')
              .eq('id', match.nextMatchId)
              .single()

            if (updatedNextMatch?.homeTeamId && updatedNextMatch?.awayTeamId) {
              await supabase
                .from('Match')
                .update({ status: 'pending' })
                .eq('id', match.nextMatchId)
            }
          }
        }
      }
    }

    // Handle walkover - advance winner to next round
    if (body.status === 'walkover' && body.winnerId) {
      if (match.nextMatchId) {
        const slot = match.nextMatchSlot === 'home' ? 'homeTeamId' : 'awayTeamId'
        await supabase
          .from('Match')
          .update({ [slot]: body.winnerId })
          .eq('id', match.nextMatchId)
      }
    }

    return NextResponse.json(matchWithDetails)
  } catch (error) {
    console.error('Error updating match:', error)
    return NextResponse.json({ error: 'Failed to update match' }, { status: 500 })
  }
}
