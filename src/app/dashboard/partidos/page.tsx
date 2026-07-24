'use client'

import { Suspense } from 'react'
import OrganizerMatches from '@/components/tournament/OrganizerMatches'
import { Loader2 } from 'lucide-react'

export default function PartidosPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <OrganizerMatches />
    </Suspense>
  )
}
