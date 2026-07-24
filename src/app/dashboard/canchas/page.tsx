'use client'

import { Suspense } from 'react'
import OrganizerCourts from '@/components/tournament/OrganizerCourts'
import { Loader2 } from 'lucide-react'

export default function CanchasPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <OrganizerCourts />
    </Suspense>
  )
}
