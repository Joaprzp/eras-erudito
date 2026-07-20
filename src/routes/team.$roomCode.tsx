import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from 'convex/react'
import { FormEvent, useState } from 'react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useSessionStore } from '../stores/session'

export const Route = createFileRoute('/team/$roomCode')({
  component: TeamRoom,
})

function TeamRoom() {
  const { roomCode } = Route.useParams()
  const joinRoom = useMutation(api.rooms.join)
  const startRoom = useMutation(api.rooms.start)
  const leaveRoom = useMutation(api.rooms.leave)
  const removeTeam = useMutation(api.rooms.remove)
  const roll = useMutation(api.rooms.roll)
  const closeRoom = useMutation(api.rooms.close)
  const chooseRival = useMutation(api.rooms.chooseRival)
  const chooseBet = useMutation(api.rooms.chooseBet)
  const drawCard = useMutation(api.rooms.drawCard)
  const submitResponse = useMutation(api.rooms.submitResponse)
  const revealResponses = useMutation(api.rooms.revealResponses)
  const resolveCommon = useMutation(api.rooms.resolveCommon)
  const advanceTurn = useMutation(api.rooms.advanceTurn)
  const chooseCategory = useMutation(api.rooms.chooseCategory)
  const buyCoin = useMutation(api.rooms.buyCoin)
  const saveTeamSession = useSessionStore((state) => state.saveTeamSession)
  const clearTeamSession = useSessionStore((state) => state.clearTeamSession)
  const existingSession = useSessionStore((state) => state.teamsByRoom[roomCode])
  const lobby = useQuery(
    api.rooms.teamLobby,
    existingSession ? { code: roomCode, token: existingSession.token } : 'skip',
  )
  const isActiveGame = lobby?.phase === 'active'
  const [name, setName] = useState('')
  const [color, setColor] = useState(TEAM_COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  async function runAction(action: string, operation: () => Promise<unknown>, failureMessage: string) {
    if (pendingAction) return
    setError(null)
    setPendingAction(action)

    try {
      await operation()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : failureMessage)
    } finally {
      setPendingAction(null)
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsJoining(true)

    try {
      const team = await joinRoom({ code: roomCode, name, color })
      saveTeamSession(roomCode, { token: team.token })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No pudimos entrar a la sala.')
    } finally {
      setIsJoining(false)
    }
  }

  async function handleStart() {
    if (!existingSession) return
    await runAction('start', () => startRoom({ code: roomCode, token: existingSession.token }), 'No pudimos iniciar la partida.')
  }

  async function handleLeave() {
    if (!existingSession) return
    await runAction('leave', async () => {
      await leaveRoom({ code: roomCode, token: existingSession.token })
      clearTeamSession(roomCode)
    }, 'No pudimos salir de la sala.')
  }

  async function handleClose() {
    if (!existingSession) return
    if (!window.confirm('¿Cerrar y borrar esta partida para todos los equipos?')) return
    await runAction('close', async () => {
      await closeRoom({ code: roomCode, token: existingSession.token })
      clearTeamSession(roomCode)
    }, 'No pudimos cerrar la sala.')
  }

  async function handleRemove(teamId: Id<'teams'>) {
    if (!existingSession) return
    if (!window.confirm('¿Quitar este equipo de la sala?')) return
    await runAction('remove', () => removeTeam({ code: roomCode, token: existingSession.token, teamId }), 'No pudimos quitar el equipo.')
  }

  async function handleRoll() {
    if (!existingSession) return
    await runAction('roll', () => roll({ code: roomCode, token: existingSession.token }), 'No pudimos tirar los dados.')
  }

  async function handleChooseRival(targetId: Id<'teams'>) {
    if (!existingSession) return
    await runAction('rival', () => chooseRival({ code: roomCode, token: existingSession.token, targetId }), 'No pudimos elegir al retado.')
  }

  async function handleChooseBet(wager: number) {
    if (!existingSession) return
    await runAction('bet', () => chooseBet({ code: roomCode, token: existingSession.token, wager }), 'No pudimos fijar la apuesta.')
  }

  async function handleDrawCard() {
    if (!existingSession) return
    await runAction('card', () => drawCard({ code: roomCode, token: existingSession.token }), 'No pudimos sacar una tarjeta.')
  }

  async function handleSubmitResponse(payload: string) {
    if (!existingSession) return
    await runAction('answer', () => submitResponse({ code: roomCode, token: existingSession.token, payload }), 'No pudimos confirmar la respuesta.')
  }

  async function handleRevealResponses() {
    if (!existingSession) return
    await runAction('reveal', () => revealResponses({ code: roomCode, token: existingSession.token }), 'No pudimos revelar las respuestas.')
  }

  async function handleResolveCommon(outcome: 'challenger' | 'target' | 'tie') {
    if (!existingSession) return
    await runAction('resolve', () => resolveCommon({ code: roomCode, token: existingSession.token, outcome }), 'No pudimos resolver la ronda.')
  }

  async function handleAdvanceTurn() {
    if (!existingSession) return
    await runAction('advance', () => advanceTurn({ code: roomCode, token: existingSession.token }), 'No pudimos continuar la partida.')
  }

  async function handleChooseCategory(category: 'sequence' | 'association' | 'common' | 'approximation') {
    if (!existingSession) return
    await runAction('category', () => chooseCategory({ code: roomCode, token: existingSession.token, category }), 'No pudimos elegir la categoría.')
  }

  async function handleBuyCoin() {
    if (!existingSession) return
    await runAction('coin', () => buyCoin({ code: roomCode, token: existingSession.token }), 'No pudimos comprar la moneda.')
  }

  return (
    <main className={isActiveGame ? 'min-h-screen bg-paper px-4 py-4 text-ink sm:px-6' : 'grid min-h-screen place-items-center bg-paper px-5 py-8 text-ink'}>
      <div className="mx-auto w-full max-w-sm">
        {!isActiveGame ? <>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-coral">Dispositivo de equipo</p>
          <h1 className="mt-3 font-display text-6xl tracking-[-0.06em]">Sala {roomCode}</h1>
        </> : null}
        {existingSession ? (
          <LobbyPanel
            lobby={lobby}
            error={error}
            pendingAction={pendingAction}
            onLeave={handleLeave}
            onChooseBet={handleChooseBet}
            onChooseRival={handleChooseRival}
            onClose={handleClose}
            onDrawCard={handleDrawCard}
            onRemove={handleRemove}
            onRevealResponses={handleRevealResponses}
            onResolveCommon={handleResolveCommon}
            onRoll={handleRoll}
            onStart={handleStart}
            onAdvanceTurn={handleAdvanceTurn}
            onBuyCoin={handleBuyCoin}
            onChooseCategory={handleChooseCategory}
            onSubmitResponse={handleSubmitResponse}
          />
        ) : (
          <form className="mt-7 space-y-6 rounded-[1.8rem] border-2 border-ink p-5 text-left" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink/60">Nombre del equipo</span>
              <input
                className="mt-2 w-full border-b-2 border-ink bg-transparent px-0 py-2 font-display text-3xl tracking-[-0.05em] outline-none placeholder:text-ink/25 focus:border-coral"
                placeholder="Los sabiondos"
                value={name}
                minLength={2}
                maxLength={24}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>
            <fieldset>
              <legend className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink/60">Color del peón</legend>
              <div className="mt-3 flex gap-3">
                {TEAM_COLORS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-label={`Elegir color ${option}`}
                    aria-pressed={color === option}
                    className="grid h-10 w-10 place-items-center rounded-full border-2 border-ink transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral"
                    style={{ backgroundColor: option }}
                    onClick={() => setColor(option)}
                  >
                    {color === option ? <span className="h-2.5 w-2.5 rounded-full bg-paper" /> : null}
                  </button>
                ))}
              </div>
            </fieldset>
            {error ? <p className="rounded-xl bg-coral/20 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
            <button
              type="submit"
              disabled={isJoining}
              className="w-full rounded-full bg-ink px-5 py-3 text-sm font-black text-paper transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
            >
              {isJoining ? 'Entrando…' : 'Entrar a la sala'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

function TeamCockpit({ lobby, isMyTurn }: { lobby: Exclude<TeamLobby, null | undefined>; isMyTurn: boolean }) {
  const selfTeam = lobby.teams.find((team) => team.id === lobby.self.id)
  const activity = teamActivity(lobby, isMyTurn)

  return <header className="rounded-[1.5rem] bg-ink p-3 text-paper shadow-[0_16px_35px_rgb(33_22_15_/_0.16)]">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-4 w-4 shrink-0 rounded-full ring-2 ring-paper/35" style={{ backgroundColor: selfTeam?.color }} />
        <div className="min-w-0"><p className="truncate font-display text-2xl tracking-[-0.05em]">{lobby.self.name}</p><p className="mt-0.5 text-[0.54rem] font-black uppercase tracking-[0.15em] text-paper/55">Sala {lobby.code}</p></div>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.56rem] font-black uppercase tracking-[0.1em] ${isMyTurn ? 'bg-saffron text-ink' : 'bg-paper/12 text-paper/75'}`}>{isMyTurn ? 'Tu turno' : 'En juego'}</span>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-1.5"><span className="rounded-xl bg-paper px-2 py-1.5 text-center text-sm font-black text-ink">${lobby.self.money}</span><span className="rounded-xl bg-saffron px-2 py-1.5 text-center text-sm font-black text-ink">{selfTeam?.coins ?? 0} {(selfTeam?.coins ?? 0) === 1 ? 'moneda' : 'monedas'}</span><span className="rounded-xl bg-paper/12 px-2 py-1.5 text-center text-sm font-bold text-paper/80">Dado {lobby.lastRoll ?? '—'}</span></div>
    <p className="mt-3 border-t border-paper/12 pt-2 text-xs font-semibold leading-snug text-paper/80">{activity}</p>
  </header>
}

function teamActivity(lobby: Exclude<TeamLobby, null | undefined>, isMyTurn: boolean) {
  const round = lobby.round
  const challenger = round ? lobby.teams.find((team) => team.id === round.challengerId)?.name ?? 'El retador' : undefined
  const target = round?.targetId ? lobby.teams.find((team) => team.id === round.targetId)?.name : undefined

  if (!round) return isMyTurn ? 'Te toca tirar los dados y mover al equipo.' : `Esperando que ${lobby.teams.find((team) => team.id === lobby.turnTeamId)?.name ?? 'otro equipo'} tire los dados.`
  if (round.phase === 'choose_category') return `${challenger} elige la categoría de Inicio.`
  if (round.phase === 'choose_rival') return `${challenger} está eligiendo a quién retar.`
  if (round.phase === 'choose_bet') return `${challenger} define la apuesta${target ? ` contra ${target}` : ''}.`
  if (round.phase === 'awaiting_card') return `${challenger} está por sacar la tarjeta.`
  if (round.phase === 'answering') return round.category === 'approximation' ? 'Todos los equipos escriben su aproximación en privado.' : `${challenger}${target ? ` y ${target}` : ''} están respondiendo en privado.`
  if (round.phase === 'ready_to_reveal') return 'Las respuestas están listas para revelar.'
  if (round.phase === 'revealed') return round.category === 'common' ? 'El anfitrión está evaluando las respuestas.' : 'La pantalla companion muestra la solución.'
  return 'La ronda se resolvió; el anfitrión continuará la partida.'
}

function LobbyPanel({
  lobby,
  error,
  pendingAction,
  onLeave,
  onChooseBet,
  onChooseCategory,
  onChooseRival,
  onClose,
  onDrawCard,
  onRemove,
  onRevealResponses,
  onResolveCommon,
  onRoll,
  onStart,
  onAdvanceTurn,
  onBuyCoin,
  onSubmitResponse,
}: {
  lobby: TeamLobby
  error: string | null
  pendingAction: string | null
  onLeave: () => void
  onChooseBet: (wager: number) => void
  onChooseCategory: (category: 'sequence' | 'association' | 'common' | 'approximation') => void
  onChooseRival: (teamId: Id<'teams'>) => void
  onClose: () => void
  onDrawCard: () => void
  onRemove: (teamId: Id<'teams'>) => void
  onRevealResponses: () => void
  onResolveCommon: (outcome: 'challenger' | 'target' | 'tie') => void
  onRoll: () => void
  onStart: () => void
  onAdvanceTurn: () => void
  onBuyCoin: () => void
  onSubmitResponse: (payload: string) => void
}) {
  if (lobby === undefined) {
    return <p className="mt-6 text-ink/60">Recuperando tu plaza…</p>
  }

  if (lobby === null) {
    return <p className="mt-6 rounded-2xl bg-coral/15 px-5 py-4 text-sm font-semibold text-coral">Esta plaza ya no está disponible.</p>
  }

  if (lobby.phase === 'active') {
    const isMyTurn = lobby.turnTeamId === lobby.self.id
    const round = lobby.round
    const target = round?.targetId ? lobby.teams.find((team) => team.id === round.targetId) : undefined
    const isChallenger = round?.challengerId === lobby.self.id
    const maximumWager = !round ? 0 : round.category === 'approximation'
      ? Math.min(round.maxBet, ...lobby.teams.map((team) => team.money))
      : target ? Math.min(round.maxBet, lobby.self.money, target.money) : 0

    return <section className="text-left">
      <TeamCockpit lobby={lobby} isMyTurn={isMyTurn} />
      {round ? <RoundPanel pendingAction={pendingAction} round={round} roundState={lobby.roundState} self={lobby.self} isChallenger={isChallenger} maximumWager={maximumWager} target={target} teams={lobby.teams} onAdvanceTurn={onAdvanceTurn} onChooseBet={onChooseBet} onChooseCategory={onChooseCategory} onChooseRival={onChooseRival} onDrawCard={onDrawCard} onRevealResponses={onRevealResponses} onResolveCommon={onResolveCommon} onSubmitResponse={onSubmitResponse} /> : null}
      {lobby.shopEligible ? <button type="button" disabled={lobby.self.money < 1000 || Boolean(pendingAction)} className="mt-3 min-h-12 w-full rounded-2xl bg-saffron px-4 py-3 text-sm font-black text-ink transition-transform active:scale-[0.98] disabled:opacity-35" onClick={onBuyCoin}>{pendingAction === 'coin' ? 'Comprando moneda…' : lobby.self.money >= 1000 ? 'Comprar moneda · $1000' : 'Te faltan $1000 para comprar moneda'}</button> : null}
      {error ? <p className="mt-3 rounded-xl bg-coral/20 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
      {isMyTurn && !round ? <button type="button" disabled={Boolean(pendingAction)} className="mt-3 min-h-14 w-full rounded-full bg-ink px-5 py-4 text-base font-black text-paper transition-transform active:scale-[0.98] disabled:opacity-60" onClick={onRoll}>{pendingAction === 'roll' ? 'Tirando dados…' : 'Tirar dos dados'}</button> : null}
      {lobby.self.isHost ? <details className="mt-3 rounded-2xl border border-ink/15 bg-ink/4 px-4 py-3"><summary className="cursor-pointer text-sm font-bold">Acciones de anfitrión</summary><button type="button" disabled={Boolean(pendingAction)} className="mt-3 w-full rounded-xl border border-coral/45 px-4 py-3 text-sm font-bold text-coral disabled:opacity-50" onClick={onClose}>{pendingAction === 'close' ? 'Cerrando…' : 'Cerrar y borrar partida'}</button></details> : null}
    </section>
  }

  if (lobby.phase === 'finished') {
    const winner = lobby.winnerTeamId ? lobby.teams.find((team) => team.id === lobby.winnerTeamId)?.name : undefined
    return <section className="mt-6 rounded-[1.8rem] border-2 border-ink bg-saffron/35 p-5 text-left"><p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-coral">Partida terminada</p><h2 className="mt-2 font-display text-4xl tracking-[-0.05em]">{winner ?? 'La partida'} gana.</h2><p className="mt-3 text-sm font-semibold text-ink/70">El anfitrión puede cerrar esta sala cuando quieran.</p>{lobby.self.isHost ? <button type="button" disabled={Boolean(pendingAction)} className="mt-5 min-h-12 w-full rounded-full border border-coral/45 px-5 py-3 text-sm font-bold text-coral disabled:opacity-45" onClick={onClose}>{pendingAction === 'close' ? 'Cerrando…' : 'Cerrar y borrar partida'}</button> : null}</section>
  }

  return (
    <section className="mt-7 rounded-[1.8rem] border-2 border-ink p-5 text-left">
      <div className="flex items-baseline justify-between gap-3"><p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink/60">Sala de espera</p><p className="text-sm font-black">{lobby.teams.length}/4</p></div>
      <p className="mt-2 text-sm font-semibold text-ink/60">{lobby.teams.length < 2 ? 'Falta al menos un equipo para empezar.' : lobby.teams.length < 4 ? `Pueden entrar ${4 - lobby.teams.length} equipos más.` : 'La mesa está completa.'}</p>
      <div className="mt-4 space-y-2">
        {lobby.teams.map((team) => (
          <div key={team.id} className="flex items-center gap-3 rounded-xl bg-ink/6 px-3 py-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
            <span className="font-semibold">{team.name}</span>
            {team.isHost ? <span className="ml-auto text-[0.58rem] font-bold uppercase tracking-[0.15em] text-coral">anfitrión</span> : null}
            {lobby.self.isHost && team.id !== lobby.self.id ? (
              <button type="button" disabled={Boolean(pendingAction)} className="ml-auto text-xs font-bold underline underline-offset-4 disabled:opacity-35" onClick={() => onRemove(team.id)}>{pendingAction === 'remove' ? 'Quitando…' : 'Quitar'}</button>
            ) : null}
          </div>
        ))}
      </div>
      {error ? <p className="mt-4 rounded-xl bg-coral/20 px-3 py-2 text-sm font-semibold text-coral">{error}</p> : null}
      <div className="mt-6 grid gap-2">
        {lobby.self.isHost ? <button type="button" disabled={lobby.teams.length < 2 || Boolean(pendingAction)} className="min-h-12 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper disabled:cursor-not-allowed disabled:opacity-35" onClick={onStart}>{pendingAction === 'start' ? 'Iniciando…' : lobby.teams.length < 2 ? 'Esperando otro equipo' : 'Iniciar partida'}</button> : <p className="rounded-xl bg-mint/25 px-3 py-3 text-sm font-semibold">Esperando que {lobby.teams[0]?.name ?? 'el anfitrión'} inicie.</p>}
        <button type="button" disabled={Boolean(pendingAction)} className="min-h-12 rounded-full border border-ink/30 px-5 py-3 text-sm font-bold disabled:opacity-35" onClick={onLeave}>{pendingAction === 'leave' ? 'Saliendo…' : 'Salir de la sala'}</button>
      </div>
    </section>
  )
}

function RoundPanel({
  isChallenger,
  maximumWager,
  pendingAction,
  onChooseBet,
  onChooseCategory,
  onChooseRival,
  onDrawCard,
  onAdvanceTurn,
  onRevealResponses,
  onResolveCommon,
  onSubmitResponse,
  round,
  roundState,
  self,
  target,
  teams,
}: {
  isChallenger: boolean
  maximumWager: number
  pendingAction: string | null
  onChooseBet: (wager: number) => void
  onChooseCategory: (category: 'sequence' | 'association' | 'common' | 'approximation') => void
  onChooseRival: (teamId: Id<'teams'>) => void
  onDrawCard: () => void
  onAdvanceTurn: () => void
  onRevealResponses: () => void
  onResolveCommon: (outcome: 'challenger' | 'target' | 'tie') => void
  onSubmitResponse: (payload: string) => void
  round: NonNullable<Exclude<TeamLobby, null | undefined>['round']>
  roundState: Exclude<TeamLobby, null | undefined>['roundState']
  self: Exclude<TeamLobby, null | undefined>['self']
  target: Team | undefined
  teams: Team[]
}) {
  const category = CATEGORY_LABELS[round.category]
  const isBusy = Boolean(pendingAction)

  if (round.phase === 'choose_category') {
    return <div className="mt-3 rounded-2xl bg-saffron/30 p-3"><p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">Inicio · tope $500</p><p className="mt-1 font-display text-2xl tracking-[-0.05em]">Elegí la categoría.</p>{isChallenger ? <div className="mt-3 grid grid-cols-2 gap-2">{(Object.keys(CATEGORY_LABELS) as Array<keyof typeof CATEGORY_LABELS>).map((item) => <button key={item} type="button" disabled={isBusy} className="min-h-12 rounded-xl bg-paper px-3 py-3 text-sm font-black transition-transform active:scale-[0.97] disabled:opacity-45" onClick={() => onChooseCategory(item)}>{pendingAction === 'category' ? 'Guardando…' : CATEGORY_LABELS[item]}</button>)}</div> : <p className="mt-2 text-sm font-semibold">El retador elige la categoría de Inicio.</p>}</div>
  }

  if (round.phase === 'choose_rival') {
    return <div className="mt-3 rounded-2xl bg-saffron/30 p-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">{category} · tope ${round.maxBet}</p>
      <p className="mt-1 font-display text-2xl tracking-[-0.05em]">Elegí al retado.</p>
      {isChallenger ? <div className="mt-3 grid gap-2">{teams.filter((team) => team.id !== round.challengerId).map((team) => <button key={team.id} type="button" disabled={isBusy} className="flex min-h-12 items-center gap-3 rounded-xl bg-paper px-3 py-3 text-left font-bold transition-transform active:scale-[0.98] disabled:opacity-45" onClick={() => onChooseRival(team.id)}><span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />{pendingAction === 'rival' ? 'Eligiendo rival…' : team.name}<span className="ml-auto text-xs text-ink/55">${team.money}</span></button>)}</div> : <p className="mt-2 text-sm font-semibold">El retador elige quién responde.</p>}
    </div>
  }

  if (round.phase === 'choose_bet') {
    return <div className="mt-3 rounded-2xl bg-mint/35 p-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">{category} · {target ? `vs. ${target.name}` : 'retado elegido'}</p>
      <p className="mt-1 font-display text-2xl tracking-[-0.05em]">¿Cuánto se juega?</p>
      {isChallenger ? <div className="mt-3 grid grid-cols-3 gap-2">{BET_OPTIONS.filter((wager) => wager <= maximumWager).map((wager) => <button key={wager} type="button" disabled={isBusy} className="min-h-12 rounded-xl bg-ink px-3 py-3 text-sm font-black text-paper transition-transform active:scale-[0.97] disabled:opacity-45" onClick={() => onChooseBet(wager)}>{pendingAction === 'bet' ? '…' : `$${wager}`}</button>)}</div> : <p className="mt-2 text-sm font-semibold">El retador está definiendo la apuesta.</p>}
      {isChallenger && maximumWager < 100 ? <p className="mt-2 text-sm font-semibold text-coral">No hay fondos suficientes para la apuesta mínima.</p> : null}
    </div>
  }

  if (round.phase === 'awaiting_card') {
    return <div className="mt-3 rounded-2xl bg-sky-200 p-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">{category} · apuesta ${round.wager}</p>
      <p className="mt-1 font-display text-2xl tracking-[-0.05em]">El mazo está listo.</p>
      {isChallenger ? <button type="button" disabled={isBusy} className="mt-3 min-h-12 w-full rounded-xl bg-ink px-4 py-3 text-sm font-black text-paper transition-transform active:scale-[0.98] disabled:opacity-45" onClick={onDrawCard}>{pendingAction === 'card' ? 'Sacando tarjeta…' : 'Sacar tarjeta'}</button> : <p className="mt-2 text-sm font-semibold text-ink/70">El retador saca una tarjeta.</p>}
    </div>
  }

  if (!roundState) return null

  const answersThisRound = round.category === 'approximation' || isChallenger || round.targetId === self.id

  if (round.phase === 'answering') {
    if (roundState.hasSubmitted) return <WaitingCard count={roundState.requiredResponseCount} />
    if (!answersThisRound) return <WaitingCard count={roundState.requiredResponseCount} />
    return <AnswerCard card={roundState.card} isSubmitting={pendingAction === 'answer'} onSubmit={onSubmitResponse} />
  }

  if (round.phase === 'ready_to_reveal') {
    return <div className="mt-3 rounded-2xl bg-mint/35 p-3">
      <p className="font-display text-2xl tracking-[-0.05em]">Todas las respuestas están selladas.</p>
      {self.isHost ? <button type="button" disabled={isBusy} className="mt-3 min-h-12 w-full rounded-xl bg-ink px-4 py-3 text-sm font-black text-paper disabled:opacity-45" onClick={onRevealResponses}>{pendingAction === 'reveal' ? 'Revelando…' : 'Revelar en la pantalla'}</button> : <p className="mt-2 text-sm font-semibold text-ink/70">El anfitrión revelará la tarjeta.</p>}
    </div>
  }

  if (round.phase === 'revealed' && round.category === 'common') {
    return <div className="mt-3 rounded-2xl bg-mint/35 p-3">
      <p className="font-display text-2xl tracking-[-0.05em]">El anfitrión decide.</p>
      {self.isHost ? <div className="mt-3 rounded-xl border border-ink/15 bg-paper/45 p-3"><p className="text-[0.58rem] font-black uppercase tracking-[0.16em] text-ink/55">Control de anfitrión</p><div className="mt-2 grid gap-2"><button type="button" disabled={isBusy} className="min-h-12 rounded-xl bg-ink px-4 py-3 text-sm font-black text-paper disabled:opacity-45" onClick={() => onResolveCommon('challenger')}>{pendingAction === 'resolve' ? 'Resolviendo…' : 'Gana el retador'}</button><button type="button" disabled={isBusy} className="min-h-12 rounded-xl bg-paper px-4 py-3 text-sm font-black disabled:opacity-45" onClick={() => onResolveCommon('target')}>Gana el retado</button><button type="button" disabled={isBusy} className="min-h-12 rounded-xl border border-ink/35 px-4 py-3 text-sm font-black disabled:opacity-45" onClick={() => onResolveCommon('tie')}>Empate</button></div></div> : <p className="mt-2 text-sm font-semibold text-ink/70">El anfitrión está evaluando las respuestas.</p>}
    </div>
  }

  if (round.phase === 'resolved') {
    const winners = round.result?.winnerTeamIds.map((id) => teams.find((team) => team.id === id)?.name ?? 'Equipo').join(' y ')
    return <div className="mt-3 rounded-2xl bg-saffron/30 p-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">Ronda resuelta</p>
      <p className="mt-1 font-display text-2xl tracking-[-0.05em]">{round.result?.kind === 'tie' ? 'Empate: no se movió dinero.' : `${winners} gana $${round.result?.payout ?? 0}.`}</p>
      {self.isHost ? <button type="button" disabled={isBusy} className="mt-3 min-h-12 w-full rounded-xl bg-ink px-4 py-3 text-sm font-black text-paper disabled:opacity-45" onClick={onAdvanceTurn}>{pendingAction === 'advance' ? 'Continuando…' : 'Continuar partida'}</button> : <p className="mt-2 text-sm font-semibold text-ink/70">El anfitrión continúa la partida.</p>}
    </div>
  }

  return <div className="mt-3 rounded-2xl bg-mint/35 p-3">
    <p className="font-display text-2xl tracking-[-0.05em]">Respuestas reveladas.</p>
    <p className="mt-2 text-sm font-semibold text-ink/70">La resolución de la ronda llega en el siguiente paso.</p>
  </div>
}

function WaitingCard({ count }: { count: number }) {
  return <div className="mt-3 rounded-2xl bg-sky-200 p-3">
    <p className="font-display text-2xl tracking-[-0.05em]">Respuesta guardada.</p>
    <p className="mt-2 text-sm font-semibold text-ink/70">Esperando el cierre de las demás respuestas. Participan {count} equipos y cada respuesta sigue privada.</p>
  </div>
}

function AnswerCard({ card, isSubmitting, onSubmit }: { card: PublicCard; isSubmitting: boolean; onSubmit: (payload: string) => void }) {
  const [sequence, setSequence] = useState<string[]>([])
  const [pairs, setPairs] = useState<Array<{ left: string; right: string }>>([])
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null)
  const [commonAnswer, setCommonAnswer] = useState('')
  const [approximation, setApproximation] = useState('')

  if (card.category === 'sequence') {
    return <div className="mt-3 rounded-2xl bg-sky-200 p-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">Secuencia · tocá en orden</p>
      <p className="mt-1 font-display text-2xl leading-tight tracking-[-0.04em]">{card.instruction}</p>
      <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.14em] text-ink/55">{sequence.length}/{card.items.length} elegidos</p><button type="button" disabled={!sequence.length || isSubmitting} className="text-xs font-bold underline underline-offset-4 disabled:opacity-35" onClick={() => setSequence(sequence.slice(0, -1))}>Deshacer último</button></div>
      <div className="mt-2 flex min-h-14 flex-wrap gap-2 rounded-xl border border-ink/15 bg-paper/55 p-2">{sequence.length ? sequence.map((item, index) => <span key={item} className="rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-paper">{index + 1}. {item}</span>) : <span className="px-2 py-1 text-sm text-ink/45">Tu orden aparecerá aquí.</span>}</div>
      <div className="mt-3 flex flex-wrap gap-2">{card.items.filter((item) => !sequence.includes(item)).map((item) => <button key={item} type="button" disabled={isSubmitting} className="min-h-11 rounded-full border border-ink/35 bg-paper px-3 py-2 text-sm font-bold transition-transform active:scale-[0.97] disabled:opacity-40" onClick={() => setSequence([...sequence, item])}>{item}</button>)}</div>
      <SubmitBar disabled={sequence.length !== card.items.length} isSubmitting={isSubmitting} onClick={() => onSubmit(JSON.stringify(sequence))} />
    </div>
  }

  if (card.category === 'association') {
    const assignedLeft = pairs.map((pair) => pair.left)
    const assignedRight = pairs.map((pair) => pair.right)
    return <div className="mt-3 rounded-2xl bg-saffron/30 p-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">Asociación · elegí una pareja</p>
      <p className="mt-1 font-display text-2xl leading-tight tracking-[-0.04em]">{card.instruction}</p>
      <div className="mt-3 grid grid-cols-2 gap-3"><div><p className="mb-2 text-[0.58rem] font-black uppercase tracking-[0.14em] text-ink/55">Primero</p><div className="grid gap-2">{card.leftItems.map((item) => <button key={item} type="button" disabled={assignedLeft.includes(item) || isSubmitting} className={`min-h-11 rounded-xl border px-2 py-2 text-left text-xs font-bold transition-transform active:scale-[0.97] ${selectedLeft === item ? 'border-ink bg-ink text-paper' : 'border-ink/25 bg-paper'} disabled:opacity-35`} onClick={() => setSelectedLeft(item)}>{item}</button>)}</div></div><div><p className="mb-2 text-[0.58rem] font-black uppercase tracking-[0.14em] text-ink/55">Después</p><div className="grid gap-2">{card.rightItems.map((item) => <button key={item} type="button" disabled={!selectedLeft || assignedRight.includes(item) || isSubmitting} className="min-h-11 rounded-xl border border-ink/25 bg-paper px-2 py-2 text-left text-xs font-bold transition-transform active:scale-[0.97] disabled:opacity-35" onClick={() => { if (!selectedLeft) return; setPairs([...pairs, { left: selectedLeft, right: item }]); setSelectedLeft(null) }}>{item}</button>)}</div></div></div>
      {pairs.length ? <div className="mt-3 space-y-1"><p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-ink/55">Parejas elegidas · {pairs.length}/{card.leftItems.length}</p>{pairs.map((pair) => <button key={pair.left} type="button" disabled={isSubmitting} className="block min-h-9 w-full rounded-lg bg-paper/70 px-2 py-1 text-left text-xs font-bold disabled:opacity-35" onClick={() => setPairs(pairs.filter((entry) => entry.left !== pair.left))}>{pair.left} — {pair.right} ×</button>)}</div> : null}
      <SubmitBar disabled={pairs.length !== card.leftItems.length} isSubmitting={isSubmitting} onClick={() => onSubmit(JSON.stringify(pairs))} />
    </div>
  }

  if (card.category === 'common') {
    return <div className="mt-3 rounded-2xl bg-mint/35 p-3">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">En común</p>
      <div className="mt-2 flex flex-wrap gap-2">{card.clues.map((clue) => <span key={clue} className="rounded-full bg-paper px-3 py-1.5 text-sm font-bold">{clue}</span>)}</div>
      <textarea autoFocus className="mt-3 min-h-24 w-full rounded-xl border border-ink/25 bg-paper p-3 text-sm font-semibold outline-none focus:border-coral" value={commonAnswer} maxLength={300} placeholder="¿Qué tienen en común?" onChange={(event) => setCommonAnswer(event.target.value)} />
      <SubmitBar disabled={commonAnswer.trim().length < 2} isSubmitting={isSubmitting} onClick={() => onSubmit(JSON.stringify(commonAnswer.trim()))} />
    </div>
  }

  return <div className="mt-3 rounded-2xl bg-saffron/30 p-3">
    <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">Aproximación</p>
    <p className="mt-1 font-display text-2xl leading-tight tracking-[-0.04em]">{card.prompt}</p>
    <p className="mt-3 inline-flex rounded-full bg-paper px-3 py-1.5 text-sm font-black">Respondé en {card.unit}</p>
    <input autoFocus type="number" inputMode="decimal" className="mt-3 min-h-14 w-full rounded-xl border border-ink/25 bg-paper p-3 text-2xl font-display outline-none focus:border-coral" value={approximation} placeholder="Tu cifra" onChange={(event) => setApproximation(event.target.value)} />
    <SubmitBar disabled={!Number.isFinite(Number(approximation)) || approximation.trim() === ''} isSubmitting={isSubmitting} onClick={() => onSubmit(JSON.stringify(Number(approximation)))} />
  </div>
}

function SubmitBar({ disabled, isSubmitting, onClick }: { disabled: boolean; isSubmitting: boolean; onClick: () => void }) {
  return <div className="sticky bottom-3 z-10 mt-4 bg-inherit pt-2"><button type="button" disabled={disabled || isSubmitting} className="min-h-12 w-full rounded-xl bg-ink px-4 py-3 text-sm font-black text-paper shadow-[0_4px_0_rgb(0_0_0_/_0.18)] transition-transform active:scale-[0.98] disabled:opacity-35" onClick={onClick}>{isSubmitting ? 'Guardando respuesta…' : 'Confirmar respuesta'}</button></div>
}

const TEAM_COLORS = ['#e85f4a', '#e5ad22', '#63c5a0', '#4a88e6']
const BET_OPTIONS = [100, 200, 300, 400, 500]
const CATEGORY_LABELS = { sequence: 'Secuencia', association: 'Asociación', common: 'En común', approximation: 'Aproximación' }

type Team = { id: Id<'teams'>; coins: number; color: string; isHost: boolean; joinIndex: number; money: number; name: string; position: number }

type TeamLobby = {
  code: string
  phase: 'lobby' | 'active' | 'finished'
  lastRoll?: number
  round?: {
    category: 'sequence' | 'association' | 'common' | 'approximation'
    challengerId: Id<'teams'>
    maxBet: number
    phase: 'choose_category' | 'choose_rival' | 'choose_bet' | 'awaiting_card' | 'answering' | 'ready_to_reveal' | 'revealed' | 'resolved'
    cardId?: string
    roundId?: string
    targetId?: Id<'teams'>
    wager?: number
    result?: { kind: 'challenger' | 'target' | 'approximation' | 'tie'; payout: number; winnerTeamIds: Id<'teams'>[] }
    isStart?: boolean
  }
  roundState: {
    card: PublicCard
    hasSubmitted: boolean
    requiredResponseCount: number
  } | null
  shopEligible: boolean
  self: { id: Id<'teams'>; isHost: boolean; money: number; name: string; position: number }
  turnTeamId?: Id<'teams'>
  winnerTeamId?: Id<'teams'>
  teams: Team[]
} | null | undefined

type PublicCard =
  | { category: 'sequence'; id: string; instruction: string; items: string[]; solution?: string[] }
  | { category: 'association'; id: string; instruction: string; leftItems: string[]; rightItems: string[]; solution?: Array<{ left: string; right: string }> }
  | { category: 'common'; id: string; clues: string[]; solution?: string }
  | { category: 'approximation'; id: string; prompt: string; unit: string; solution?: { display: string; unit: string; value: number } }
