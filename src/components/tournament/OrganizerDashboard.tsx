/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useTournamentStore } from '@/store/tournament-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Play,
  Plus,
  Trophy,
  Users,
  MapPin,
  Clock,
  Check,
  Link,
  Share2,
  MessageCircle,
  Mic,
  LayoutDashboard,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { getRoundName } from '@/lib/bracket-algorithm'

export default function OrganizerDashboard() {
  const store = useTournamentStore()
  const [loading, setLoading] = useState(false)

  const { tournament, teams, matches, courts } = store

  const loadTournament = async () => {
    if (!store.selectedTournamentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tournaments/${store.selectedTournamentId}`)
      if (res.ok) {
        const data = await res.json()
        store.setTournamentData({
          tournament: data,
          teams: data.teams || [],
          courts: data.courts || [],
          matches: data.matches || [],
        })
      }
    } catch (err) {
      toast.error('Error al cargar el torneo')
    }
    setLoading(false)
  }

  const refreshData = () => loadTournament()

  useEffect(() => {
    if (store.selectedTournamentId && !tournament) {
      loadTournament()
    }
  }, [store.selectedTournamentId])

  const startTournament = async () => {
    if (!tournament) return
    try {
      await fetch(`/api/tournaments/${tournament.id}/start`, { method: 'POST' })
      toast.success('Torneo iniciado')
      refreshData()
    } catch (err) {
      toast.error('Error al iniciar')
    }
  }

  const getPublicLink = () => {
    if (!tournament?.publicId) return ''
    // Build the link using the current window origin
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/t/${tournament.publicId}`
  }

  const copyLink = () => {
    const link = getPublicLink()
    if (link) {
      navigator.clipboard.writeText(link)
      toast.success('Link copiado al portapapeles')
    }
  }

  const shareWhatsApp = () => {
    const link = getPublicLink()
    if (!link || !tournament) return
    const text = encodeURIComponent(
      `⚽ *${tournament.name}*

` +
      `📍 ${tournament.location}
` +
      `📅 ${new Date(tournament.date).toLocaleDateString('es-AR')}
` +
      `👥 ${teams.length} equipos

` +
      `Seguí el torneo en vivo:
${link}

` +
      `🔍 Buscá tu equipo para ver tus partidos!`
    )
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareGeneric = () => {
    const link = getPublicLink()
    if (!link || !tournament) return
    if (navigator.share) {
      navigator.share({
        title: tournament.name,
        text: `Seguí el torneo en vivo: ${link}`,
        url: link,
      }).catch(() => {})
    } else {
      copyLink()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex flex-col items-center justify-center gap-6 p-4">
        <Trophy className="h-16 w-16 text-emerald-500" />
        <h2 className="text-2xl font-bold text-white">No hay torneo activo</h2>
        <Button onClick={() => store.setCurrentView('organizer-create')}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-lg px-8 py-6">
          <Plus className="h-5 w-5 mr-2" /> Crear Nuevo Torneo
        </Button>
      </div>
    )
  }

  const totalRounds = matches.length > 0 ? Math.max(...matches.map(m => m.round)) : 0
  const playingMatches = matches.filter(m => m.status === 'playing')
  const finishedMatches = matches.filter(m => m.status === 'finished' || m.status === 'walkover')
  const pendingMatches = matches.filter(m => m.status === 'pending')
  const nextMatches = matches.filter(m => m.status === 'pending' && m.homeTeamId && m.awayTeamId).slice(0, 5)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950">
      {/* Header */}
      <header className="border-b border-emerald-800 bg-emerald-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => {
              store.setTournamentData({ tournament: null as any, teams: [], courts: [], matches: [] })
              store.setCurrentView('home')
            }}
              className="text-emerald-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">{tournament.name}</h1>
              <div className="flex items-center gap-2 text-emerald-400 text-xs">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{tournament.location}</span>
                <span>&bull;</span>
                <span>{new Date(tournament.date).toLocaleDateString('es-AR')}</span>
              </div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              tournament.status === 'active' ? 'bg-emerald-600 text-white' :
              tournament.status === 'completed' ? 'bg-gray-600 text-white' :
              'bg-yellow-600/30 text-yellow-300'
            }`}>
              {tournament.status === 'active' ? 'EN CURSO' : tournament.status === 'completed' ? 'FINALIZADO' : 'CONFIGURACIÓN'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
            <CardContent className="p-4 text-center">
              <Users className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{teams.length}</p>
              <p className="text-emerald-400 text-xs">Equipos</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
            <CardContent className="p-4 text-center">
              <Play className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{playingMatches.length}</p>
              <p className="text-emerald-400 text-xs">En Juego</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
            <CardContent className="p-4 text-center">
              <Check className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{finishedMatches.length}</p>
              <p className="text-emerald-400 text-xs">Finalizados</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{pendingMatches.length}</p>
              <p className="text-emerald-400 text-xs">Pendientes</p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700 hover:bg-white/15 transition-colors cursor-pointer"
            onClick={() => store.setCurrentView('organizer-matches')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-emerald-600 p-2 rounded-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Mesa de Control</p>
                <p className="text-emerald-400 text-xs">Gestionar partidos en vivo</p>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400" />
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700 hover:bg-white/15 transition-colors cursor-pointer"
            onClick={() => store.setCurrentView('organizer-courts')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-teal-600 p-2 rounded-lg">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Gestión de Canchas</p>
                <p className="text-emerald-400 text-xs">Asignar partidos a canchas</p>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400" />
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700 hover:bg-white/15 transition-colors cursor-pointer"
            onClick={() => store.setCurrentView('organizer-bracket')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-yellow-600 p-2 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Cuadro de Llaves</p>
                <p className="text-emerald-400 text-xs">Ver bracket completo</p>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400" />
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-emerald-700 hover:bg-white/15 transition-colors cursor-pointer"
            onClick={() => store.setCurrentView('organizer-mic')}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-red-600 p-2 rounded-lg">
                <Mic className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-white">Modo Micrófono</p>
                <p className="text-emerald-400 text-xs">Vista del anunciador (DJ)</p>
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400" />
            </CardContent>
          </Card>
        </div>

        {/* Share section - THE main way to distribute */}
        <Card className="bg-emerald-800/40 backdrop-blur-sm border-emerald-500 shadow-lg shadow-emerald-900/20">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Share2 className="h-5 w-5 text-emerald-300" />
              <h3 className="text-emerald-200 font-semibold">Compartir Torneo con los Jugadores</h3>
            </div>

            {/* WhatsApp button - primary */}
            <Button onClick={shareWhatsApp}
              className="w-full bg-green-600 hover:bg-green-500 text-white text-base py-5 gap-2">
              <MessageCircle className="h-5 w-5" />
              Compartir por WhatsApp
            </Button>

            {/* Other share options */}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={shareGeneric} variant="outline"
                className="border-emerald-600 text-emerald-300 hover:bg-emerald-800 py-4 gap-2">
                <Share2 className="h-4 w-4" />
                Compartir...
              </Button>
              <Button onClick={copyLink} variant="outline"
                className="border-emerald-600 text-emerald-300 hover:bg-emerald-800 py-4 gap-2">
                <Link className="h-4 w-4" />
                Copiar Link
              </Button>
            </div>

            {/* Show the link for reference */}
            <div className="bg-black/20 rounded-lg p-3">
              <p className="text-emerald-500 text-xs mb-1">Link público del torneo:</p>
              <p className="text-emerald-200 text-sm font-mono break-all select-all">
                {getPublicLink()}
              </p>
            </div>

            <p className="text-emerald-500/70 text-xs text-center">
              Compartí este link en tu estado, grupo o pegalo donde quieras.
              Los jugadores van a poder ver el torneo, buscar su equipo y seguir los resultados en vivo.
            </p>
          </CardContent>
        </Card>

        {/* Start Tournament */}
        {tournament.status === 'setup' && (
          <Button onClick={startTournament}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-lg py-6">
            <Play className="h-5 w-5 mr-2" /> Iniciar Torneo
          </Button>
        )}

        {/* Quick Refresh */}
        <Button onClick={refreshData} variant="outline"
          className="w-full border-emerald-600 text-emerald-300 hover:bg-emerald-800">
          Actualizar Datos
        </Button>
      </main>
    </div>
  )
}
