import Link from 'next/link'
import { Trophy, Zap, ArrowRight, Smartphone, Eye, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-900 to-teal-950 text-white">
      {/* Nav */}
      <nav className="border-b border-emerald-800/50 bg-emerald-950/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="bg-emerald-600 p-1.5 rounded-lg">
              <Trophy className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">Torneos Relámpago</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-emerald-300 hover:text-white">
                Ingresar
              </Button>
            </Link>
            <Link href="/registro">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white">
                Crear Cuenta
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-800/40 border border-emerald-600/30 rounded-full px-4 py-1.5 mb-6">
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-300 text-sm">100% gratuito para empezar</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-4">
          Organizá torneos de fútbol<br />
          <span className="text-emerald-400">en 5 minutos</span>
        </h1>
        <p className="text-emerald-200/80 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
          Mesa de control digital, bracket en tiempo real y seguimiento público.
          Sin papel, sin errores, sin dolores de cabeza.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/registro">
            <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white text-lg px-8 py-6 gap-2 w-full sm:w-auto">
              Empezar Gratis <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <a href="#como-funciona">
            <Button size="lg" variant="outline" className="border-emerald-600/50 text-emerald-300 hover:bg-emerald-800/50 text-lg px-8 py-6 w-full sm:w-auto">
              Cómo funciona
            </Button>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Smartphone, title: 'Desde tu celular', desc: 'Usá la mesa de control desde el celular. Nada de hojas de papel ni tablas confusas.' },
            { icon: Eye, title: 'Vista pública en vivo', desc: 'Compartí un link y los jugadores ven resultados, bracket y próximos partidos en tiempo real.' },
            { icon: BarChart3, title: 'Bracket automático', desc: 'Llaves, penales, walkovers, byes. Todo se calcula solo con eliminación directa.' },
          ].map((f) => (
            <Card key={f.title} className="bg-white/5 backdrop-blur-sm border-emerald-800/50 hover:bg-white/10 transition-colors">
              <CardContent className="p-6 text-center space-y-3">
                <div className="bg-emerald-600/20 p-3 rounded-xl w-fit mx-auto">
                  <f.icon className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="font-bold text-lg">{f.title}</h3>
                <p className="text-emerald-300/70 text-sm leading-relaxed">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="como-funciona" className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Cómo funciona</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Creá tu torneo', desc: 'Cargá los equipos, las reglas y las canchas. En menos de 5 minutos tenés todo listo.' },
            { step: '2', title: 'Gestioná desde el celular', desc: 'Usá la mesa de control para iniciar partidos, cargar goles y avanzar bracket en vivo.' },
            { step: '3', title: 'Todos siguen el torneo', desc: 'Compartí un link por WhatsApp. Los jugadores buscan su equipo y ven resultados en tiempo real.' },
          ].map((item) => (
            <div key={item.step} className="text-center space-y-3">
              <div className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mx-auto">
                {item.step}
              </div>
              <h3 className="font-bold text-lg">{item.title}</h3>
              <p className="text-emerald-300/70 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <Card className="bg-emerald-800/30 border-emerald-500/30">
          <CardContent className="p-8 md:p-12 text-center space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">¿Listo para organizar tu próximo torneo?</h2>
            <p className="text-emerald-300/70 max-w-lg mx-auto">Es gratis, no necesita tarjeta de crédito, y lo tenés listo en minutos.</p>
            <Link href="/registro">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 text-white text-lg px-10 py-6 gap-2">
                Crear mi cuenta gratis <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-emerald-800/50 py-6 text-center">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-600" />
            <span className="text-emerald-500 text-sm">Torneos Relámpago</span>
          </div>
          <span className="text-emerald-700 text-xs">&copy; 2025</span>
        </div>
      </footer>
    </div>
  )
}
