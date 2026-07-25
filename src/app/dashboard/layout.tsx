'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase-browser'
import { Trophy, LayoutDashboard, Plus, Swords, MapPin, GitBranch, Mic, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { href: '/dashboard/crear', label: 'Nuevo Torneo', icon: Plus },
  { href: '/dashboard/bracket', label: 'Llaves', icon: GitBranch },
  { href: '/dashboard/micro', label: 'Micrófono', icon: Mic },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const supabase = createBrowserClient()

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/login')
        return
      }
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || 'Organizador')
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 flex flex-col pb-20 md:pb-0 md:grid md:grid-cols-[220px_1fr]">
      {/* Sidebar - hidden on mobile, shown as bottom nav */}
      <aside className="hidden md:flex flex-col border-r border-emerald-800/50 bg-emerald-950/30">
        <div className="p-4 border-b border-emerald-800/50">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-white">Torneos</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-emerald-600/20 text-emerald-300 font-medium'
                    : 'text-emerald-400 hover:bg-white/5 hover:text-white'
                }`}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-emerald-800/50">
          <p className="text-emerald-400 text-xs truncate mb-2">{userName}</p>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="text-red-400 hover:text-red-300 hover:bg-red-900/20 w-full justify-start gap-2">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-emerald-800/50 bg-emerald-950/90 backdrop-blur-sm">
        <div className="flex items-center justify-around px-1 py-1.5">
          {NAV_ITEMS.slice(0, 5).map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={`flex flex-col items-center gap-0.5 py-1 rounded-lg ${
                  isActive ? 'text-emerald-400' : 'text-emerald-600'
                }`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px]">{item.label}</span>
                </div>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
