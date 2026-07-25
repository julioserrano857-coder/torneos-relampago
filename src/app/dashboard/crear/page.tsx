'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import { useTournamentStore } from '@/store/tournament-store'
import OrganizerCreate from '@/components/tournament/OrganizerCreate'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Trophy, MapPin, Trash2, Loader2, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Tournament {
  id: string
  name: string
  date: string
  location: string
  status: string
  publicId: string
  teams?: { id: string; name: string }[]
}

export default function CrearPage() {
  const router = useRouter()
  const store = useTournamentStore()
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadTournaments = useCallback(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('Tournament')
        .select('*, teams:Team(id, name)')
        .eq('organizerId', user.id)
        .order('createdAt', { ascending: false })
        .then(({ data }) => {
          if (data) setTournaments(data as unknown as Tournament[])
          setLoading(false)
        })
    })
  }, [])

  useEffect(() => { loadTournaments() }, [loadTournaments])

  const selectTournament = async (t: Tournament) => {
    try {
      const res = await fetch(`/api/tournaments/${t.id}`)
      if (res.ok) {
        const data = await res.json()
        store.setTournamentData({
          tournament: data,
          teams: data.teams || [],
          courts: data.courts || [],
          matches: data.matches || [],
        })
        store.setSelectedTournamentId(t.id)
        router.push('/dashboard')
      }
    } catch {
      toast.error('Error al cargar el torneo')
    }
  }

  const deleteTournament = async (t: Tournament, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar "${t.name}"?`)) return
    setDeleting(t.id)
    try {
      const res = await fetch(`/api/tournaments/${t.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Torneo eliminado')
        setTournaments(prev => prev.filter(p => p.id !== t.id))
      }
    } catch {
      toast.error('Error al eliminar')
    }
    setDeleting(null)
  }

  const getPublicLink = (publicId: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/t/${publicId}`
  }

  return (
    <div>
      <OrganizerCreate />

      {/* Separator */}
      <div className="px-4 py-4">
        <div className="border-t border-emerald-800/50" />
      </div>

      {/* Tournament list */}
      <div className="px-4 pb-6 space-y-3">
        <h2 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">Mis Torneos</h2>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
          </div>
        )}

        {!loading && tournaments.length === 0 && (
          <p className="text-emerald-500 text-sm text-center py-4">Aún no creaste torneos</p>
        )}

        {!loading && tournaments.map(t => (
          <Card key={t.id} className="bg-white/10 backdrop-blur-sm border-emerald-700/50 cursor-pointer hover:bg-white/15 transition-colors"
            onClick={() => selectTournament(t)}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold truncate">{t.name}</h3>
                  <div className="flex items-center gap-2 text-emerald-400 text-xs mt-1">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{t.location}</span>
                    <span>&bull;</span>
                    <span>{new Date(t.date).toLocaleDateString('es-AR')}</span>
                    {t.teams && t.teams.length > 0 && (
                      <><span>&bull;</span><span>{t.teams.length} equipos</span></>
                    )}
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  t.status === 'active' ? 'bg-emerald-600 text-white' :
                  t.status === 'completed' ? 'bg-gray-600 text-white' :
                  'bg-yellow-600/30 text-yellow-300'
                }`}>
                  {t.status === 'active' ? 'EN CURSO' : t.status === 'completed' ? 'FINALIZADO' : 'CONFIGURACIÓN'}
                </span>
              </div>

              <div className="flex gap-2">
                <Link href={`/dashboard/partidos?t=${t.id}`} className="flex-1" onClick={e => e.stopPropagation()}>
                  <Button variant="outline" size="sm"
                    className="w-full border-emerald-600/50 text-emerald-300 hover:bg-emerald-800/50">
                    Mesa de Control
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(getPublicLink(t.publicId)); toast.success('Link copiado') }}
                  className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-800/50 text-xs">
                  LINK
                </Button>
                <Button size="sm" variant="outline" onClick={(e) => deleteTournament(t, e)} disabled={deleting === t.id}
                  className="border-red-600/50 text-red-400 hover:bg-red-900/30">
                  {deleting === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
