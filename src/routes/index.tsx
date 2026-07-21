import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation } from 'convex/react'
import { ArrowRight, ArrowUpRight, BookOpenText, Dices, QrCode, Sparkles, Trophy, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'

import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/')({
  component: WelcomePage,
})

function WelcomePage() {
  const createRoom = useMutation(api.rooms.create)
  const navigate = useNavigate()
  const [isCreating, setIsCreating] = useState(false)
  const [isCodeEntryOpen, setIsCodeEntryOpen] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)

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

  async function handleEnterWithCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedCode = roomCode.trim().toUpperCase().replaceAll(/[^A-Z0-9]/g, '')

    if (normalizedCode.length !== 6) {
      setCodeError('El código de sala tiene seis caracteres.')
      return
    }

    setCodeError(null)
    await navigate({ to: '/team/$roomCode', params: { roomCode: normalizedCode } })
  }

  return (
    <main className="h-dvh overflow-hidden bg-ink text-paper">
      <div className="paper-noise pointer-events-none fixed inset-0 opacity-45" />
      <div className="relative mx-auto flex h-full max-w-7xl flex-col px-5 py-4 sm:px-8 sm:py-5 lg:px-10">
        <header className="border-b border-paper/25 pb-4">
          <Link to="/" className="group flex items-baseline gap-2" aria-label="Eras Erudito, inicio">
            <span className="font-display text-2xl tracking-[-0.06em] sm:text-3xl">Eras</span>
            <span className="font-display text-2xl text-saffron tracking-[-0.06em] sm:text-3xl">Erudito</span>
          </Link>
        </header>

        <section className="grid min-h-0 flex-1 items-center gap-6 py-6 sm:gap-8 sm:py-8 lg:grid-cols-[1.16fr_0.84fr] lg:gap-12 lg:py-6">
          <div className="max-w-3xl">
            <h1 className="font-display text-[clamp(3.7rem,10vw,8.4rem)] leading-[0.79] tracking-[-0.08em]">
              Todo lo que
              <span className="block pl-[0.17em] text-coral">sabés juega.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-paper/74 sm:text-lg">
              Una partida presencial para equipos curiosos. Cada quien responde desde su teléfono;
              la historia se mueve en la pantalla común.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                className="group inline-flex items-center gap-3 rounded-full bg-saffron px-6 py-3 text-sm font-black text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-saffron"
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreating}
              >
                {isCreating ? 'Creando sala…' : 'Crear una partida'}
                <ArrowUpRight size={17} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button
                type="button"
                aria-expanded={isCodeEntryOpen}
                aria-controls="room-code-entry"
                className="inline-flex items-center gap-2 rounded-full border border-paper/30 px-5 py-3 text-sm font-semibold text-paper transition-colors hover:border-paper hover:bg-paper/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-paper"
                onClick={() => {
                  setIsCodeEntryOpen((isOpen) => !isOpen)
                  setCodeError(null)
                }}
              >
                <QrCode size={17} />
                Entrar con código
              </button>
            </div>
            {isCodeEntryOpen ? (
              <form id="room-code-entry" className="mt-3 max-w-md rounded-[1.35rem] border border-paper/25 bg-paper/8 p-3 shadow-[0_1rem_2.5rem_rgb(0_0_0_/_0.14)]" onSubmit={handleEnterWithCode}>
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="room-code" className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-mint">Código de sala</label>
                  <button type="button" className="rounded-full p-1 text-paper/55 transition-colors hover:bg-paper/10 hover:text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper" aria-label="Cerrar entrada por código" onClick={() => setIsCodeEntryOpen(false)}><X size={16} /></button>
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    id="room-code"
                    autoFocus
                    autoCapitalize="characters"
                    autoComplete="off"
                    className="min-w-0 flex-1 rounded-xl border border-paper/30 bg-ink/55 px-3 py-2.5 font-mono text-lg font-black uppercase tracking-[0.2em] text-paper outline-none placeholder:tracking-normal placeholder:text-paper/35 focus:border-mint"
                    maxLength={6}
                    placeholder="ABC123"
                    value={roomCode}
                    onChange={(event) => {
                      setRoomCode(event.target.value.toUpperCase().replaceAll(/[^A-Z0-9]/g, ''))
                      setCodeError(null)
                    }}
                  />
                  <button type="submit" className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-mint px-3 text-sm font-black text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint">Entrar <ArrowRight size={16} /></button>
                </div>
                <p className={`mt-2 text-xs font-semibold ${codeError ? 'text-coral' : 'text-paper/60'}`}>{codeError ?? 'Escaneá el QR o escribí el código que aparece en la pantalla companion.'}</p>
              </form>
            ) : null}
          </div>

          <aside className="relative mx-auto w-full max-w-sm rotate-[-2deg] rounded-[1.6rem] bg-paper p-3 text-ink shadow-[1.1rem_1.1rem_0_0_rgb(242_97_73)] transition-transform duration-500 hover:rotate-0">
            <div className="rounded-[1.05rem] border-2 border-ink p-5 sm:p-6">
              <div className="flex items-start justify-between border-b-2 border-ink pb-4">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-ink/55">Pregunta de muestra</p>
                  <p className="mt-2 font-display text-3xl tracking-[-0.05em]">En común</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-full border-2 border-ink bg-mint">
                  <BookOpenText size={21} strokeWidth={2.4} />
                </div>
              </div>
              <p className="mt-5 font-display text-[1.8rem] leading-[0.9] tracking-[-0.05em]">
                ¿Qué une a estas cinco pistas?
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {['Idea', 'dato', 'memoria', 'riesgo', 'azar'].map((word) => (
                  <span key={word} className="rounded-full border border-ink/35 px-3 py-1.5 text-xs font-bold">
                    {word}
                  </span>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-2 border-t-2 border-ink pt-4">
                <Stat icon={<Dices size={16} />} label="2–4" value="equipos" />
                <Stat icon={<Trophy size={16} />} label="4" value="monedas" />
                <Stat icon={<Sparkles size={16} />} label="0" value="timers" />
              </div>
            </div>
          </aside>
        </section>

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
