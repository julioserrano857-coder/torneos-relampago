'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Trophy, MapPin, Calendar, ChevronRight, Loader2, LogOut, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Tournament {
  id: string
  name: string
  date: string
  location: string
  status: string
  publicId: string
  teams?: { id: string; name: string }[]
  matches?: { id: string; status: string }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const supabase = createBrowserClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserName(user.user_metadata?.name || 'Organizador')

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

  const getPublicLink = (publicId: string) => {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/t/${publicId}`
  }

  const shareWhatsApp = (t: Tournament) => {
    const link = getPublicLink(t.publicId)
    const text = encodeURIComponent(
      `⚽ *${t.name}*\n📍 ${t.location}\n📅 ${new Date(t.date).toLocaleDateString('es-AR')}\n\nSeguí el torneo en vivo:\n${link}\n\n🔍 Buscá tu equipo para ver tus partidos!`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Hola, {userName}</h1>
          <p className="text-emerald-400 text-sm">Gestioná tus torneos desde acá</p>
        </div>
      </div>

      {/* Create new tournament */}
      <Link href="/dashboard/crear">
        <Card className="bg-emerald-600/20 border-emerald-500/30 hover:bg-emerald-600/30 transition-colors cursor-pointer">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">Crear Nuevo Torneo</p>
              <p className="text-emerald-300 text-sm">Cargá equipos, reglas y canchas</p>
            </div>
            <ChevronRight className="h-5 w-5 text-emerald-400" />
          </CardContent>
        </Card>
      </Link>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && tournaments.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <Trophy className="h-16 w-16 text-emerald-700 mx-auto" />
          <h2 className="text-xl font-bold text-white">Aún no creaste torneos</h2>
          <p className="text-emerald-400 text-sm max-w-sm mx-auto">
            Creá tu primer torneo relámpago. Es gratis y lo tenés listo en minutos.
          </p>
          <Link href="/dashboard/crear">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
              <Plus className="h-4 w-4 mr-2" /> Crear Torneo
            </Button>
          </Link>
        </div>
      )}

      {/* Tournament list */}
      {!loading && tournaments.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-emerald-400 font-semibold text-sm uppercase tracking-wider">Mis Torneos</h2>
          {tournaments.map(t => (
            <Card key={t.id} className="bg-white/10 backdrop-blur-sm border-emerald-700/50">
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
                        <>
                          <span>&bull;</span>
                          <span>{t.teams.length} equipos</span>
                        </>
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
                  <Link href={`/dashboard/partidos?t=${t.id}`} className="flex-1">
                    <Button variant="outline" size="sm"
                      className="w-full border-emerald-600/50 text-emerald-300 hover:bg-emerald-800/50">
                      Mesa de Control
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => shareWhatsApp(t)}
                    className="border-green-600/50 text-green-400 hover:bg-green-900/30">
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    navigator.clipboard.writeText(getPublicLink(t.publicId))
                    toast.success('Link copiado')
                  }}
                    className="border-emerald-600/50 text-emerald-400 hover:bg-emerald-800/50 text-xs">
                    LINK
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
