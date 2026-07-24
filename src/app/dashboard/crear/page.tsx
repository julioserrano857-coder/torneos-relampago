'use client'

import { Suspense } from 'react'
import OrganizerCreate from '@/components/tournament/OrganizerCreate'
import { Loader2 } from 'lucide-react'

export default function CrearPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <OrganizerCreate />
    </Suspense>
  )
}
