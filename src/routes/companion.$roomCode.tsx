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
  const isActiveGame = lobby?.phase === 'active'

  return (
    <main className={isActiveGame ? 'min-h-screen bg-ink px-3 py-3 text-paper sm:px-6 sm:py-5 lg:px-8' : 'grid min-h-screen place-items-center bg-ink px-6 text-center text-paper'}>
      <div className={isActiveGame ? 'mx-auto w-full max-w-[110rem]' : 'max-w-xl'}>
        <div className={isActiveGame ? 'flex items-baseline justify-between gap-4 px-2 text-left lg:px-3' : ''}>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mint">Pantalla companion</p>
          <h1 className={isActiveGame ? 'font-display text-3xl tracking-[-0.06em] sm:text-4xl' : 'mt-3 font-display text-6xl tracking-[-0.06em]'}>Sala {roomCode}</h1>
        </div>
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
  const cardIsOnTable = Boolean(lobby.round && lobby.roundState && lobby.round.phase !== 'resolved')

  return (
    <section className="mt-4 w-full rounded-[2rem] border border-paper/20 bg-paper/8 p-4 text-left shadow-[0_24px_90px_rgb(0_0_0_/_0.22)] sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4 lg:px-2">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-mint">Partida en curso</p>
          <h2 className="mt-1 font-display text-3xl tracking-[-0.05em] lg:text-4xl">La mesa está servida.</h2>
        </div>
        <p className="rounded-full bg-saffron px-4 py-2 text-sm font-black text-ink">Última tirada: {lobby.lastRoll ?? '—'}</p>
      </div>

      <div className={`relative mt-5 overflow-hidden rounded-[1.65rem] border border-paper/10 bg-ink/35 ${cardIsOnTable ? 'min-h-[29rem] lg:min-h-[31rem]' : ''}`}>
        <BoardStrip lobby={lobby} dimmed={cardIsOnTable} />
        {cardIsOnTable && lobby.round && lobby.roundState ? (
          <div className="absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 px-3 sm:px-8 lg:px-16 xl:px-24">
            <QuestionPanel round={lobby.round} state={lobby.roundState} />
          </div>
        ) : null}
      </div>

      {lobby.round && !cardIsOnTable ? (
        <div className="mt-5 rounded-2xl bg-paper p-4 text-ink sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-coral">Ronda actual · {lobby.round.phase === 'choose_category' ? 'Inicio' : CATEGORY_LABELS[lobby.round.category]}</p>
            <p className="mt-1 font-display text-2xl tracking-[-0.05em] sm:text-3xl">{roundMessage(lobby)}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">
            <p className="rounded-full bg-ink px-4 py-2 text-sm font-black text-paper">{lobby.round.wager ? `$${lobby.round.wager} en juego` : `tope $${lobby.round.maxBet}`}</p>
            {lobby.round.phase === 'resolved' ? <ResultBanner lobbyRound={lobby.round} /> : null}
          </div>
        </div>
      ) : null}
      {lobby.round?.phase === 'resolved' ? <MetricsPanel teams={lobby.teams} /> : null}
      <section className="mt-5 rounded-[1.5rem] border border-paper/10 bg-ink/25 p-3 sm:p-4">
        <p className="px-1 text-[0.6rem] font-black uppercase tracking-[0.2em] text-paper/55">Equipos</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {lobby.teams.map((team) => (
            <div key={team.id} className="rounded-2xl border border-paper/10 bg-paper/8 p-3 sm:p-4">
              <div className="flex items-center gap-2.5">
                <span className="h-3.5 w-3.5 rounded-full ring-2 ring-paper/10" style={{ backgroundColor: team.color }} />
                <span className="truncate font-display text-xl tracking-[-0.035em]">{team.name}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-paper px-3 py-1.5 text-sm font-black text-ink">${team.money}</span>
                <span className="rounded-full bg-saffron px-3 py-1.5 text-sm font-black text-ink">{team.coins} {team.coins === 1 ? 'moneda' : 'monedas'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

function BoardStrip({ lobby, dimmed }: { lobby: CompanionLobby; dimmed: boolean }) {
  return (
    <div className={`p-3 transition duration-500 sm:p-5 lg:p-7 ${dimmed ? 'opacity-35 blur-[1px]' : ''}`}>
      <div className="grid grid-cols-9 gap-1.5 sm:grid-cols-14 lg:gap-2">
        <BoardCell label="Inicio" teams={lobby.teams.filter((team) => team.position === 0)} />
        {lobby.board.map((space, index) => (
          <BoardCell key={index} label={`$${space.maxBet}`} category={space.category} shop={space.isShop} teams={lobby.teams.filter((team) => team.position === index + 1)} />
        ))}
      </div>
      {dimmed ? <p className="mt-5 text-center text-[0.58rem] font-black uppercase tracking-[0.22em] text-paper/60">Tablero en pausa · la tarjeta está en juego</p> : null}
    </div>
  )
}

function MetricsPanel({ teams }: { teams: CompanionLobby['teams'] }) {
  return <section className="mt-6 rounded-2xl border border-mint/30 bg-mint/10 p-4 text-left"><p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-mint">Ritmo y precisión acumulados</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{teams.map((team) => { const averageSeconds = team.answeredCards ? Math.round(team.totalResponseMs / team.answeredCards / 1000) : null; return <div key={team.id} className="rounded-xl bg-paper/10 px-3 py-2"><p className="font-bold">{team.name}</p><p className="mt-1 text-xs text-paper/70">{team.correctMarks} aciertos · {averageSeconds === null ? 'sin respuestas aún' : `${averageSeconds}s de ritmo medio`}</p></div> })}</div></section>
}

function QuestionPanel({ round, state }: { round: NonNullable<CompanionLobby['round']>; state: NonNullable<CompanionLobby['roundState']> }) {
  const card = state.card
  const heading = card.category === 'sequence' || card.category === 'association' ? card.instruction : card.category === 'common' ? '¿Qué tienen en común?' : card.prompt

  return <section className="mx-auto max-w-3xl rounded-[2rem] border-[3px] border-ink/15 bg-paper p-5 text-left text-ink shadow-[0_28px_80px_rgb(0_0_0_/_0.5)] sm:p-7 lg:max-w-5xl lg:p-8 xl:p-10">
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/12 pb-4">
      <p className={`rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.18em] ${CARD_CATEGORY_CLASS[card.category]}`}>Tarjeta en mesa · {CATEGORY_LABELS[card.category]}</p>
      <p className="text-xs font-bold text-ink/60">{state.responseCount}/{state.requiredResponseCount} respuestas</p>
    </div>
    <p className="mt-5 font-display text-3xl leading-[0.95] tracking-[-0.055em] sm:text-4xl lg:text-5xl">{heading}</p>
    {card.category === 'sequence' ? <div className="mt-5 flex flex-wrap gap-2">{card.items.map((item) => <span key={item} className="rounded-full bg-ink/8 px-3 py-1.5 text-sm font-bold sm:px-4 sm:py-2">{item}</span>)}</div> : null}
    {card.category === 'association' ? <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-bold sm:gap-3 sm:text-base">{card.leftItems.map((item) => <span key={item} className="rounded-xl bg-ink/8 px-3 py-2.5">{item}</span>)}{card.rightItems.map((item) => <span key={item} className="rounded-xl bg-ink/8 px-3 py-2.5">{item}</span>)}</div> : null}
    {card.category === 'common' ? <div className="mt-5 flex flex-wrap gap-2">{card.clues.map((clue) => <span key={clue} className="rounded-full bg-ink/8 px-3 py-1.5 text-sm font-bold sm:px-4 sm:py-2">{clue}</span>)}</div> : null}
    {round.phase === 'revealed' ? <RevealPanel card={card} answers={state.revealedResponses ?? []} /> : <p className="mt-5 text-sm font-semibold text-ink/55">Las respuestas siguen privadas hasta la revelación.</p>}
  </section>
}

function ResultBanner({ lobbyRound }: { lobbyRound: NonNullable<CompanionLobby['round']> }) {
  const result = lobbyRound.result
  if (!result) return null
  return <p className="rounded-full bg-saffron px-3 py-2 text-sm font-black text-ink">{result.kind === 'tie' ? 'Empate: las apuestas quedan intactas.' : `Pozo repartido: $${result.payout} por ganador.`}</p>
}

function RevealPanel({ answers, card }: { answers: Array<{ answer: unknown; teamId: Id<'teams'>; teamName: string }>; card: PublicCard }) {
  const solution = card.solution
  return <div className="mt-5 border-t border-ink/12 pt-4">
    <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-coral">Solución</p>
    <p className="mt-1 font-display text-2xl tracking-[-0.04em]">{typeof solution === 'string' ? solution : Array.isArray(solution) ? solution.map((item) => typeof item === 'string' ? item : `${item.left} — ${item.right}`).join(' · ') : solution?.display}</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2">{answers.map((entry) => <div key={entry.teamId} className="rounded-xl bg-ink/8 px-3 py-2"><p className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-ink/55">{entry.teamName}</p><p className="mt-1 text-sm font-semibold">{formatAnswer(entry.answer)}</p></div>)}</div>
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

const CARD_CATEGORY_CLASS = {
  sequence: 'bg-coral text-ink',
  association: 'bg-saffron text-ink',
  common: 'bg-mint text-ink',
  approximation: 'bg-sky-400 text-ink',
}

type PublicCard =
  | { category: 'sequence'; id: string; instruction: string; items: string[]; solution?: string[] }
  | { category: 'association'; id: string; instruction: string; leftItems: string[]; rightItems: string[]; solution?: Array<{ left: string; right: string }> }
  | { category: 'common'; id: string; clues: string[]; solution?: string }
  | { category: 'approximation'; id: string; prompt: string; unit: string; solution?: { display: string; unit: string; value: number } }
