'use client'

import { Suspense } from 'react'
import OrganizerBracket from '@/components/tournament/OrganizerBracket'
import { Loader2 } from 'lucide-react'

export default function BracketPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <OrganizerBracket />
    </Suspense>
  )
}
