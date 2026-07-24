import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

// POST /api/tournaments/[id]/start - Start tournament
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = getSupabaseAdmin()

    const { data: tournament, error } = await supabase
      .from('Tournament')
      .update({ status: 'active' })
      .eq('id', id)
      .select()
      .single()

    if (error || !tournament) {
      throw new Error(error?.message || 'Failed to start tournament')
    }

    return NextResponse.json(tournament)
  } catch (error) {
    console.error('Error starting tournament:', error)
    return NextResponse.json({ error: 'Failed to start tournament' }, { status: 500 })
  }
}
