import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { QRCodeSVG } from 'qrcode.react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/companion/$roomCode')({
  validateSearch: (search) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: CompanionRoom,
})

function CompanionRoom() {
  const { roomCode } = Route.useParams()
  const { token } = Route.useSearch()
  const lobby = useQuery(
    api.rooms.companionLobby,
    token ? { code: roomCode, companionToken: token } : 'skip',
  )
  const joinUrl = `${window.location.origin}/team/${roomCode}`

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-6 text-center text-paper">
      <div className="max-w-xl">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-mint">Pantalla companion</p>
        <h1 className="mt-3 font-display text-6xl tracking-[-0.06em]">Sala {roomCode}</h1>
        {!token ? <p className="mt-5 text-coral">Falta la credencial de companion.</p> : null}
        {token && lobby === undefined ? <p className="mt-5 text-paper/65">Abriendo la sala…</p> : null}
        {token && lobby === null ? <p className="mt-5 text-coral">No encontramos esta sala.</p> : null}
        {lobby ? (
          lobby.phase === 'active' ? <GameBoard lobby={lobby} /> : lobby.phase === 'finished' ? <FinishedBoard lobby={lobby} /> : <div className="mt-8 grid gap-6 rounded-3xl border border-paper/20 bg-paper/8 p-6 text-left sm:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-saffron">Código para equipos</p>
              <p className="mt-2 font-display text-6xl tracking-[0.1em]">{lobby.code}</p>
              <p className="mt-7 text-sm text-paper/60">{lobby.teams.length}/4 equipos en espera</p>
              <div className="mt-4 space-y-2">
                {lobby.teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-3 rounded-xl bg-paper/8 px-3 py-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                    <span className="font-semibold">{team.name}</span>
                    {team.isHost ? <span className="ml-auto text-[0.6rem] font-bold uppercase tracking-[0.16em] text-mint">anfitrión</span> : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="self-start rounded-2xl bg-paper p-3">
              <QRCodeSVG value={joinUrl} size={132} bgColor="#f7efd9" fgColor="#21160f" level="M" includeMargin />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  )
}

function FinishedBoard({ lobby }: { lobby: CompanionLobby }) {
  const winner = lobby.winnerTeamId ? lobby.teams.find((team) => team.id === lobby.winnerTeamId) : undefined
  return <section className="mt-8 rounded-[2rem] border border-saffron/60 bg-saffron p-8 text-ink"><p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-coral">Partida terminada</p><h2 className="mt-2 font-display text-6xl tracking-[-0.06em]">{winner?.name ?? 'Tenemos ganador'}</h2><p className="mt-3 text-lg font-semibold">{winner ? `${winner.coins} monedas · $${winner.money}` : 'El anfitrión puede cerrar la sala.'}</p></section>
}

function GameBoard({ lobby }: { lobby: CompanionLobby }) {
  return (
    <section className="mt-8 w-full max-w-6xl rounded-[2rem] border border-paper/20 bg-paper/8 p-4 text-left sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-mint">Partida en curso</p>
          <h2 className="mt-1 font-display text-4xl tracking-[-0.05em]">La mesa está servida.</h2>
        </div>
        <p className="rounded-full bg-saffron px-4 py-2 text-sm font-black text-ink">Última tirada: {lobby.lastRoll ?? '—'}</p>
      </div>
      <div className="mt-6 grid grid-cols-9 gap-1.5 sm:grid-cols-14">
        <BoardCell label="Inicio" teams={lobby.teams.filter((team) => team.position === 0)} />
        {lobby.board.map((space, index) => (
          <BoardCell key={index} label={`$${space.maxBet}`} category={space.category} shop={space.isShop} teams={lobby.teams.filter((team) => team.position === index + 1)} />
        ))}
      </div>
      {lobby.round ? <div className="mt-6 rounded-2xl bg-paper p-4 text-ink sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-coral">Ronda actual · {lobby.round.phase === 'choose_category' ? 'Inicio' : CATEGORY_LABELS[lobby.round.category]}</p>
          <p className="mt-1 font-display text-3xl tracking-[-0.05em]">{roundMessage(lobby)}</p>
        </div>
        <p className="mt-3 rounded-full bg-ink px-4 py-2 text-sm font-black text-paper sm:mt-0">{lobby.round.wager ? `$${lobby.round.wager} en juego` : `tope $${lobby.round.maxBet}`}</p>
      </div> : null}
      {lobby.round && lobby.roundState ? <QuestionPanel round={lobby.round} state={lobby.roundState} /> : null}
      {lobby.round?.phase === 'resolved' ? <MetricsPanel teams={lobby.teams} /> : null}
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {lobby.teams.map((team) => (
          <div key={team.id} className="flex items-center gap-3 rounded-xl bg-paper/10 px-3 py-3">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
            <span className="font-bold">{team.name}</span>
            <span className="ml-auto text-xs text-paper/65">${team.money} · {team.coins} monedas · {team.correctMarks} aciertos · casillero {team.position}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function MetricsPanel({ teams }: { teams: CompanionLobby['teams'] }) {
  return <section className="mt-6 rounded-2xl border border-mint/30 bg-mint/10 p-4 text-left"><p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-mint">Ritmo y precisión acumulados</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{teams.map((team) => { const averageSeconds = team.answeredCards ? Math.round(team.totalResponseMs / team.answeredCards / 1000) : null; return <div key={team.id} className="rounded-xl bg-paper/10 px-3 py-2"><p className="font-bold">{team.name}</p><p className="mt-1 text-xs text-paper/70">{team.correctMarks} aciertos · {averageSeconds === null ? 'sin respuestas aún' : `${averageSeconds}s de ritmo medio`}</p></div> })}</div></section>
}

function QuestionPanel({ round, state }: { round: NonNullable<CompanionLobby['round']>; state: NonNullable<CompanionLobby['roundState']> }) {
  const card = state.card
  const heading = card.category === 'sequence' || card.category === 'association' ? card.instruction : card.category === 'common' ? '¿Qué tienen en común?' : card.prompt

  return <section className="mt-6 rounded-2xl border border-paper/30 bg-paper/14 p-5 text-left">
    <div className="flex items-baseline justify-between gap-4">
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-mint">Tarjeta en mesa · {CATEGORY_LABELS[card.category]}</p>
      <p className="text-xs font-bold text-paper/70">{state.responseCount}/{state.requiredResponseCount} respuestas</p>
    </div>
    <p className="mt-2 font-display text-3xl leading-tight tracking-[-0.04em]">{heading}</p>
    {card.category === 'sequence' ? <div className="mt-4 flex flex-wrap gap-2">{card.items.map((item) => <span key={item} className="rounded-full bg-paper/15 px-3 py-1.5 text-sm font-bold">{item}</span>)}</div> : null}
    {card.category === 'association' ? <div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold">{card.leftItems.map((item) => <span key={item} className="rounded-lg bg-paper/12 px-3 py-2">{item}</span>)}{card.rightItems.map((item) => <span key={item} className="rounded-lg bg-paper/12 px-3 py-2">{item}</span>)}</div> : null}
    {card.category === 'common' ? <div className="mt-4 flex flex-wrap gap-2">{card.clues.map((clue) => <span key={clue} className="rounded-full bg-paper/15 px-3 py-1.5 text-sm font-bold">{clue}</span>)}</div> : null}
    {round.phase === 'revealed' || round.phase === 'resolved' ? <RevealPanel card={card} answers={state.revealedResponses ?? []} /> : <p className="mt-4 text-sm font-semibold text-paper/65">Las respuestas siguen privadas hasta la revelación.</p>}
    {round.phase === 'resolved' ? <ResultBanner lobbyRound={round} /> : null}
  </section>
}

function ResultBanner({ lobbyRound }: { lobbyRound: NonNullable<CompanionLobby['round']> }) {
  const result = lobbyRound.result
  if (!result) return null
  return <p className="mt-4 rounded-xl bg-saffron px-3 py-2 text-sm font-black text-ink">{result.kind === 'tie' ? 'Empate: las apuestas quedan intactas.' : `Pozo repartido: $${result.payout} por ganador.`}</p>
}

function RevealPanel({ answers, card }: { answers: Array<{ answer: unknown; teamId: Id<'teams'>; teamName: string }>; card: PublicCard }) {
  const solution = card.solution
  return <div className="mt-5 border-t border-paper/20 pt-4">
    <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-saffron">Solución</p>
    <p className="mt-1 font-display text-2xl tracking-[-0.04em]">{typeof solution === 'string' ? solution : Array.isArray(solution) ? solution.map((item) => typeof item === 'string' ? item : `${item.left} — ${item.right}`).join(' · ') : solution?.display}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">{answers.map((entry) => <div key={entry.teamId} className="rounded-xl bg-paper/10 px-3 py-2"><p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-mint">{entry.teamName}</p><p className="mt-1 text-sm font-semibold">{formatAnswer(entry.answer)}</p></div>)}</div>
  </div>
}

function formatAnswer(answer: unknown) {
  if (Array.isArray(answer)) return answer.map((item) => typeof item === 'string' ? item : typeof item === 'object' && item !== null && 'left' in item && 'right' in item ? `${String(item.left)} — ${String(item.right)}` : String(item)).join(' · ')
  return String(answer)
}

function roundMessage(lobby: CompanionLobby) {
  const round = lobby.round
  if (!round) return ''

  const challenger = lobby.teams.find((team) => team.id === round.challengerId)?.name ?? 'El retador'
  const target = round.targetId ? lobby.teams.find((team) => team.id === round.targetId)?.name : undefined

  if (round.phase === 'choose_rival') return `${challenger} elige rival.`
  if (round.phase === 'choose_category') return `${challenger} elige una categoría de Inicio.`
  if (round.phase === 'choose_bet') return `${challenger} apuesta contra ${target ?? 'su rival'}.`
  if (round.phase === 'awaiting_card') return `${challenger} va a sacar una tarjeta.`
  if (round.phase === 'answering') return `${challenger} vs. ${target ?? 'su rival'}: respuestas en curso.`
  if (round.phase === 'ready_to_reveal') return 'Todas las respuestas están listas.'
  if (round.phase === 'resolved') return 'Ronda resuelta.'
  return 'Tarjeta revelada.'
}

function BoardCell({ category, label, shop = false, teams = [] }: { category?: string; label: string; shop?: boolean; teams?: Array<Pick<CompanionLobby['teams'][number], 'color' | 'id' | 'name'>> }) {
  const categoryClass = category === 'sequence' ? 'bg-coral' : category === 'association' ? 'bg-saffron' : category === 'common' ? 'bg-mint' : category === 'approximation' ? 'bg-sky-400' : 'bg-paper'

  return <div className={`relative grid aspect-square min-w-0 place-items-center rounded-md ${categoryClass} text-[0.5rem] font-black text-ink sm:text-[0.6rem]`}>{label}{teams.length ? <span className="absolute -bottom-1 -left-1 flex -space-x-1">{teams.map((team) => <span key={team.id} title={team.name} className="h-3 w-3 rounded-full border border-ink bg-current" style={{ color: team.color }} />)}</span> : null}{shop ? <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-ink text-[0.48rem] text-saffron">E</span> : null}</div>
}

type CompanionLobby = {
  board: Array<{ category: 'sequence' | 'association' | 'common' | 'approximation'; isShop: boolean; maxBet: number }>
  code: string
  lastRoll?: number
  phase: 'lobby' | 'active' | 'finished'
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
    requiredResponseCount: number
    responseCount: number
    revealedResponses?: Array<{ answer: unknown; teamId: Id<'teams'>; teamName: string }>
    submittedTeamIds: Id<'teams'>[]
  } | null
  teams: Array<{ answeredCards: number; coins: number; color: string; correctMarks: number; id: Id<'teams'>; isHost: boolean; joinIndex: number; money: number; name: string; position: number; status: 'connected' | 'eliminated'; totalResponseMs: number }>
  turnTeamId?: Id<'teams'>
  winnerTeamId?: Id<'teams'>
}

const CATEGORY_LABELS = { sequence: 'Secuencia', association: 'Asociación', common: 'En común', approximation: 'Aproximación' }

type PublicCard =
  | { category: 'sequence'; id: string; instruction: string; items: string[]; solution?: string[] }
  | { category: 'association'; id: string; instruction: string; leftItems: string[]; rightItems: string[]; solution?: Array<{ left: string; right: string }> }
  | { category: 'common'; id: string; clues: string[]; solution?: string }
  | { category: 'approximation'; id: string; prompt: string; unit: string; solution?: { display: string; unit: string; value: number } }
