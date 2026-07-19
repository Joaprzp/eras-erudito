import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ArrowUpRight, BookOpenText, Dices, QrCode, Sparkles, Trophy } from 'lucide-react'
import { useState, type ReactNode } from 'react'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({
  component: WelcomePage,
})

function WelcomePage() {
  const createRoom = useMutation(api.rooms.create)
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)

  async function handleCreateRoom() {
    setIsCreating(true)

    try {
      const room = await createRoom({})
      await navigate({
        to: '/companion/$roomCode',
        params: { roomCode: room.code },
        search: { token: room.companionToken },
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-paper">
      <div className="paper-noise pointer-events-none fixed inset-0 opacity-45" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-paper/25 pb-5">
          <Link to="/" className="group flex items-baseline gap-2" aria-label="Eras Erudito, inicio">
            <span className="font-display text-2xl tracking-[-0.06em] sm:text-3xl">Eras</span>
            <span className="font-display text-2xl text-saffron tracking-[-0.06em] sm:text-3xl">Erudito</span>
            <span className="ml-1 hidden text-[0.63rem] font-semibold uppercase tracking-[0.22em] text-paper/55 sm:inline">
              salón de juego
            </span>
          </Link>
          <span className="rounded-full border border-paper/25 px-3 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-paper/70">
            prueba privada
          </span>
        </header>

        <section className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.16fr_0.84fr] lg:py-16">
          <div className="max-w-3xl">
            <div className="mb-7 flex items-center gap-3 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-mint">
              <span className="h-px w-10 bg-mint" />
              Cultura general, sin solemnidad
            </div>
            <h1 className="font-display text-[clamp(4.2rem,12vw,9.8rem)] leading-[0.77] tracking-[-0.08em]">
              Todo lo que
              <span className="block pl-[0.17em] text-coral">sabés juega.</span>
            </h1>
            <p className="mt-9 max-w-xl text-base leading-relaxed text-paper/74 sm:text-lg">
              Una partida presencial para equipos curiosos. Cada quien responde desde su teléfono;
              la historia se mueve en la pantalla común.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <button
                className="group inline-flex items-center gap-3 rounded-full bg-saffron px-6 py-3 text-sm font-black text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron"
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? 'Creando sala…' : 'Crear una partida'}
                <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-full border border-paper/30 px-5 py-3 text-sm font-semibold text-paper transition-colors hover:border-paper hover:bg-paper/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper">
                <QrCode size={17} />
                Entrar con código
              </button>
            </div>
          </div>

          <aside className="relative mx-auto w-full max-w-md rotate-[-2deg] rounded-[1.8rem] bg-paper p-3 text-ink shadow-[1.3rem_1.3rem_0_0_rgb(242_97_73)] transition-transform duration-500 hover:rotate-0">
            <div className="rounded-[1.2rem] border-2 border-ink p-5 sm:p-7">
              <div className="flex items-start justify-between border-b-2 border-ink pb-5">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-ink/55">Pregunta de muestra</p>
                  <p className="mt-2 font-display text-3xl tracking-[-0.05em]">En común</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-mint">
                  <BookOpenText size={21} strokeWidth={2.4} />
                </div>
              </div>
              <p className="mt-7 font-display text-[1.95rem] leading-[0.9] tracking-[-0.05em]">
                ¿Qué une a estas cinco pistas?
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {['Idea', 'dato', 'memoria', 'riesgo', 'azar'].map((word) => (
                  <span key={word} className="rounded-full border border-ink/35 px-3 py-1.5 text-xs font-bold">
                    {word}
                  </span>
                ))}
              </div>
              <div className="mt-8 grid grid-cols-3 gap-2 border-t-2 border-ink pt-5">
                <Stat icon={<Dices size={16} />} label="2–4" value="equipos" />
                <Stat icon={<Trophy size={16} />} label="4" value="monedas" />
                <Stat icon={<Sparkles size={16} />} label="0" value="timers" />
              </div>
            </div>
          </aside>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-paper/25 pt-5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-paper/55">
          <span>Partidas efímeras · respuestas privadas</span>
          <span>Hecho para discutir con cariño</span>
        </footer>
      </div>
    </main>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink px-3 py-3 text-paper">
      <div className="flex items-center gap-1.5 text-saffron">{icon}<span className="text-xs font-black">{label}</span></div>
      <p className="mt-1 text-[0.61rem] font-semibold uppercase tracking-[0.12em] text-paper/62">{value}</p>
    </div>
  )
}
