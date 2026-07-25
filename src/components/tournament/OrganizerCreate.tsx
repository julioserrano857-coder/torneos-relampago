'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useState } from 'react'
import { Plus, Trash2, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CourtDef {
  name: string
  type: 'main' | 'penalties'
}

export default function OrganizerCreate() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')
  const [matchTime, setMatchTime] = useState(10)
  const [hasExtraTime, setHasExtraTime] = useState(false)
  const [penaltiesPerTeam, setPenaltiesPerTeam] = useState(5)
  const [teamsText, setTeamsText] = useState('')
  const [courts, setCourts] = useState<CourtDef[]>([
    { name: 'Cancha 1', type: 'main' },
    { name: 'Cancha 2', type: 'main' },
    { name: 'Penales', type: 'penalties' },
  ])
  const [loading, setLoading] = useState(false)

  const addCourt = () => {
    setCourts([...courts, { name: `Cancha ${courts.length + 1}`, type: 'main' }])
  }

  const removeCourt = (index: number) => {
    if (courts.length > 1) {
      setCourts(courts.filter((_, i) => i !== index))
    }
  }

  const updateCourtName = (index: number, name: string) => {
    const newCourts = [...courts]
    newCourts[index].name = name
    setCourts(newCourts)
  }

  const parseTeams = (text: string): string[] => {
    return text
      .split('\n')
      .map((line) => line.replace(/^[,\t;\d.\-)\s]+/, '').trim())
      .filter((line) => line.length > 0)
  }

  const teamCount = parseTeams(teamsText).length

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Ingresa el nombre del torneo')
      return
    }
    if (!date) {
      toast.error('Ingresa la fecha')
      return
    }
    if (teamCount < 2) {
      toast.error('Necesitas al menos 2 equipos')
      return
    }

    setLoading(true)
    try {
      const teamNames = parseTeams(teamsText)
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          date,
          location,
          matchTime,
          hasExtraTime,
          penaltiesPerTeam,
          teamNames,
          courtNames: courts,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Torneo "${name}" creado con ${teamCount} equipos`)

        // Cargar datos completos del torneo en el store
        const detailRes = await fetch(`/api/tournaments/${data.id}`)
        if (detailRes.ok) {
          const detail = await detailRes.json()
          const { useTournamentStore } = await import('@/store/tournament-store')
          const store = useTournamentStore.getState()
          store.setTournamentData({
            tournament: detail,
            teams: detail.teams || [],
            courts: detail.courts || [],
            matches: detail.matches || [],
          })
          store.setSelectedTournamentId(detail.id)
        }

        router.push('/dashboard')
      } else {
        toast.error('Error al crear el torneo')
      }
    } catch (err) {
      toast.error('Error de conexión')
    }
    setLoading(false)
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}
          className="text-emerald-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Button>
        <h1 className="text-lg font-bold text-white">Crear Nuevo Torneo</h1>
      </div>

      {/* Basic Info */}
      <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Información del Torneo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-emerald-300">Nombre del Torneo</Label>
            <Input id="name" placeholder="Ej: Copa Relámpago Verano 2026" value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/10 border-emerald-600 text-white placeholder:text-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-emerald-300">Fecha</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="bg-white/10 border-emerald-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location" className="text-emerald-300">Lugar</Label>
              <Input id="location" placeholder="Club, estadio..." value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="bg-white/10 border-emerald-600 text-white placeholder:text-emerald-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Reglas de Juego</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matchTime" className="text-emerald-300">Tiempo de Partido (min)</Label>
              <Input id="matchTime" type="number" inputMode="numeric" pattern="[0-9]*" min={5} max={30} value={matchTime}
                onChange={(e) => setMatchTime(parseInt(e.target.value) || 10)}
                className="bg-white/10 border-emerald-600 text-white" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="penaltiesPerTeam" className="text-emerald-300">Penales por Equipo</Label>
              <Input id="penaltiesPerTeam" type="number" inputMode="numeric" pattern="[0-9]*" min={3} max={10} value={penaltiesPerTeam}
                onChange={(e) => setPenaltiesPerTeam(parseInt(e.target.value) || 5)}
                className="bg-white/10 border-emerald-600 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch id="extraTime" checked={hasExtraTime} onCheckedChange={setHasExtraTime}
              className="data-[state=checked]:bg-emerald-600" />
            <Label htmlFor="extraTime" className="text-emerald-300">Tiempo extra (10&apos;+10&apos;)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Teams */}
      <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center justify-between">
            Equipos
            <span className="text-emerald-400 text-sm font-normal">{teamCount} equipos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={`Pega aquí la lista de equipos, uno por línea:\nLos Leones\nHalcones FC\nClub Atlético Sol\nEstrella Roja\n...`}
            value={teamsText}
            onChange={(e) => setTeamsText(e.target.value)}
            className="bg-white/10 border-emerald-600 text-white placeholder:text-emerald-500 min-h-[200px] font-mono text-sm"
          />
          <p className="text-emerald-500 text-xs">
            También podés pegar desde Excel o CSV. Los números y prefijos se eliminan automáticamente.
            {teamCount > 0 && (
              <span className="ml-2 text-emerald-300">
                {teamCount === 2 ? '→ 2 equipos: 1 partido final' :
                 teamCount <= 4 ? `→ ${teamCount} equipos: ${Math.ceil(Math.log2(teamCount))} rondas` :
                 `→ ${teamCount} equipos: ${Math.ceil(Math.log2(teamCount))} rondas`}
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Courts */}
      <Card className="bg-white/10 backdrop-blur-sm border-emerald-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Canchas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {courts.map((court, index) => (
            <div key={index} className="flex gap-2">
              <Input value={court.name} onChange={(e) => updateCourtName(index, e.target.value)}
                className="bg-white/10 border-emerald-600 text-white flex-1" />
              <span className={`text-xs px-2 py-2 rounded ${court.type === 'penalties' ? 'bg-yellow-600/20 text-yellow-300' : 'bg-emerald-600/20 text-emerald-300'}`}>
                {court.type === 'penalties' ? 'Penales' : 'Principal'}
              </span>
              <Button size="icon" variant="ghost" onClick={() => removeCourt(index)}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addCourt}
            className="w-full border-emerald-600 text-emerald-300 hover:bg-emerald-800">
            <Plus className="h-4 w-4 mr-2" /> Agregar Cancha
          </Button>
        </CardContent>
      </Card>

      {/* Create Button */}
      <Button onClick={handleCreate} disabled={loading || !name.trim() || teamCount < 2}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-lg py-6">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
          <><Save className="h-5 w-5 mr-2" /> Crear Torneo con {teamCount} Equipos</>
        )}
      </Button>
    </div>
  )
}
