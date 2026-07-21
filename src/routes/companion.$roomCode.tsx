import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { QRCodeSVG } from 'qrcode.react'

import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Board3D } from '../components/board-3d'

export const Route = createFileRoute('/companion/$roomCode')({
  validateSearch: (search) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: CompanionRoom,
})

const SOUND_FILES = {
  answersReady: '/sfx/answers-ready.mp3',
  answersReveal: '/sfx/answers-reveal.mp3',
  cardReveal: '/sfx/card-reveal.mp3',
  coinPurchase: '/sfx/coin-purchase.mp3',
  diceRoll: '/sfx/dice-roll.mp3',
  gameWon: '/sfx/game-won.mp3',
  roundTie: '/sfx/round-tie.mp3',
  roundWon: '/sfx/round-won.mp3',
  tokenMove: '/sfx/token-move.mp3',
} as const
const WIND_SOUND_FILE = '/sfx/seamless-wind.mp3'
const WIND_VOLUME = 0.035
const WIND_DUCKED_VOLUME = 0.011
const RESULT_MODAL_EXIT_MS = 14_600
const RESULT_MODAL_DISMISS_MS = 15_000

type CompanionSound = keyof typeof SOUND_FILES

function useCompanionSound(enabled: boolean, duckWind: () => void) {
  return useCallback((sound: CompanionSound) => {
    if (!enabled) return

    duckWind()
    const audio = new Audio(SOUND_FILES[sound])
    audio.volume = sound === 'gameWon' ? 0.28 : 0.2
    void audio.play().catch(() => undefined)
  }, [duckWind, enabled])
}

function useAmbientWind(enabled: boolean, naturallyDucked: boolean) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const fadeFrame = useRef<number | null>(null)
  const duckTimeout = useRef<number | null>(null)
  const [effectDucked, setEffectDucked] = useState(false)

  const ensureAudio = useCallback(() => {
    if (audio.current) return audio.current
    const wind = new Audio(WIND_SOUND_FILE)
    wind.loop = true
    wind.preload = 'auto'
    wind.volume = 0
    audio.current = wind
    return wind
  }, [])

  const activate = useCallback(() => {
    const wind = ensureAudio()
    void wind.play().catch(() => undefined)
  }, [ensureAudio])

  const duckForEffect = useCallback(() => {
    setEffectDucked(true)
    if (duckTimeout.current !== null) window.clearTimeout(duckTimeout.current)
    duckTimeout.current = window.setTimeout(() => {
      setEffectDucked(false)
      duckTimeout.current = null
    }, 1_600)
  }, [])

  useEffect(() => {
    const wind = enabled ? ensureAudio() : audio.current
    if (!wind) return
    if (enabled && wind.paused) void wind.play().catch(() => undefined)
    if (fadeFrame.current !== null) window.cancelAnimationFrame(fadeFrame.current)

    const target = enabled ? naturallyDucked || effectDucked ? WIND_DUCKED_VOLUME : WIND_VOLUME : 0
    const initial = wind.volume
    const startedAt = performance.now()
    const duration = enabled ? 1_800 : 700
    const fade = (now: number) => {
      const progress = Math.max(0, Math.min((now - startedAt) / duration, 1))
      const eased = 1 - Math.pow(1 - progress, 3)
      wind.volume = Math.max(0, Math.min(initial + (target - initial) * eased, 1))
      if (progress < 1) {
        fadeFrame.current = window.requestAnimationFrame(fade)
        return
      }
      fadeFrame.current = null
      if (!enabled) wind.pause()
    }
    fadeFrame.current = window.requestAnimationFrame(fade)

    return () => {
      if (fadeFrame.current !== null) window.cancelAnimationFrame(fadeFrame.current)
    }
  }, [effectDucked, enabled, ensureAudio, naturallyDucked])

  useEffect(() => () => {
    if (fadeFrame.current !== null) window.cancelAnimationFrame(fadeFrame.current)
    if (duckTimeout.current !== null) window.clearTimeout(duckTimeout.current)
    audio.current?.pause()
    audio.current = null
  }, [])

  return { activate, duckForEffect }
}

function SoundControl({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return <button type="button" aria-pressed={enabled} className={`min-h-9 rounded-full border px-3 py-1.5 text-[0.62rem] font-black uppercase tracking-[0.12em] transition-colors ${enabled ? 'border-mint/60 bg-mint text-ink' : 'border-paper/20 bg-paper/8 text-paper/70'}`} onClick={onClick}>{enabled ? 'Sonido activo' : 'Activar sonido'}</button>
}

function CompanionRoom() {
  const { roomCode } = Route.useParams()
  const { token } = Route.useSearch()
  const lobby = useQuery(
    api.rooms.companionLobby,
    token ? { code: roomCode, companionToken: token } : 'skip',
  )
  const joinUrl = `${window.location.origin}/team/${roomCode}`
  const isActiveGame = lobby?.phase === 'active'
  const isBoardView = isActiveGame || lobby?.phase === 'finished'
  const [soundEnabled, setSoundEnabled] = useState(false)
  const ambientDucked = Boolean(isActiveGame && lobby?.round && lobby.roundState)
  const { activate: activateWind, duckForEffect: duckWind } = useAmbientWind(soundEnabled, ambientDucked)
  const playSound = useCompanionSound(soundEnabled, duckWind)
  const previousPhase = useRef<CompanionLobby['phase'] | undefined>(undefined)

  useEffect(() => {
    const nextPhase = lobby?.phase
    const wasActive = previousPhase.current === 'active'
    previousPhase.current = nextPhase
    if (wasActive && nextPhase === 'finished') playSound('gameWon')
  }, [lobby?.phase, playSound])

  function toggleSound() {
    if (soundEnabled) {
      setSoundEnabled(false)
      return
    }

    activateWind()
    setSoundEnabled(true)
    const preview = new Audio(SOUND_FILES.answersReady)
    preview.volume = 0.18
    void preview.play().catch(() => undefined)
  }

  return (
    <main className={isBoardView ? 'min-h-screen bg-ink px-3 py-3 text-paper sm:px-6 sm:py-5 lg:px-8' : 'grid min-h-screen place-items-center bg-ink px-6 text-center text-paper'}>
      <div className={isBoardView ? 'mx-auto w-full max-w-[110rem]' : 'max-w-xl'}>
        {!isBoardView ? <>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-mint">Pantalla companion</p>
          <h1 className="mt-3 font-display text-6xl tracking-[-0.06em]">Sala {roomCode}</h1>
        </> : null}
        {!token ? <p className="mt-5 text-coral">Falta la credencial de companion.</p> : null}
        {token && lobby === undefined ? <p className="mt-5 text-paper/65">Abriendo la sala…</p> : null}
        {token && lobby === null ? <p className="mt-5 text-coral">No encontramos esta sala.</p> : null}
        {lobby ? (
          lobby.phase === 'active' ? <GameBoard lobby={lobby} soundEnabled={soundEnabled} onToggleSound={toggleSound} playSound={playSound} /> : lobby.phase === 'finished' ? <FinishedBoard lobby={lobby} soundEnabled={soundEnabled} onToggleSound={toggleSound} /> : <div className="mt-8 grid gap-6 rounded-3xl border border-paper/20 bg-paper/8 p-6 text-left sm:grid-cols-[1fr_auto]">
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

function FinishedBoard({ lobby, onToggleSound, soundEnabled }: { lobby: CompanionLobby; onToggleSound: () => void; soundEnabled: boolean }) {
  const winner = lobby.winnerTeamId ? lobby.teams.find((team) => team.id === lobby.winnerTeamId) : undefined
  return <section className="relative overflow-hidden rounded-[2rem] border border-saffron/45 bg-paper/8 text-left shadow-[0_28px_100px_rgb(0_0_0_/_0.45)]">
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-48 bg-gradient-to-b from-saffron/18 to-transparent" />
    <div className="relative z-20 flex flex-wrap items-end justify-between gap-4 px-5 pt-5 sm:px-8 sm:pt-7">
      <div>
        <p className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-saffron">Partida terminada · Sala {lobby.code}</p>
        <h1 className="mt-1 font-display text-4xl tracking-[-0.06em] text-paper sm:text-6xl">La mesa tiene campeón.</h1>
      </div>
      <div className="flex items-center gap-2"><SoundControl enabled={soundEnabled} onClick={onToggleSound} /><p className="rounded-full border border-saffron/35 bg-saffron/12 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-saffron">Victoria</p></div>
    </div>
    <div className="relative mt-4 border-y border-paper/10 bg-ink/40">
      <Board3D board={lobby.board} dice={lobby.lastDice} dimmed={false} rollId={lobby.lastRollId} teams={lobby.teams} winnerTeamId={lobby.winnerTeamId} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink/70 to-transparent" />
    </div>
    <div className="relative z-20 grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
      <div>
        <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-coral">Equipo ganador</p>
        <h2 className="mt-1 font-display text-5xl tracking-[-0.06em] text-saffron sm:text-7xl">{winner?.name ?? 'Tenemos ganador'}</h2>
      </div>
      <p className="text-base font-bold text-paper/70 sm:text-right sm:text-lg">{winner ? `${winner.coins} monedas · $${winner.money}` : 'El anfitrión puede cerrar la sala.'}</p>
    </div>
  </section>
}

function GameBoard({ lobby, onToggleSound, playSound, soundEnabled }: { lobby: CompanionLobby; onToggleSound: () => void; playSound: (sound: CompanionSound) => void; soundEnabled: boolean }) {
  const resolvedRoundId = lobby.round?.phase === 'resolved' ? lobby.round.roundId : undefined
  const [dismissedMetricsRoundId, setDismissedMetricsRoundId] = useState<string | undefined>()
  const [exitingMetricsRoundId, setExitingMetricsRoundId] = useState<string | undefined>()
  const [dismissedResultRoundId, setDismissedResultRoundId] = useState<string | undefined>()
  const [exitingResultRoundId, setExitingResultRoundId] = useState<string | undefined>()
  const metricsToastVisible = Boolean(resolvedRoundId && dismissedResultRoundId === resolvedRoundId && dismissedMetricsRoundId !== resolvedRoundId)
  const metricsToastExiting = Boolean(resolvedRoundId && exitingMetricsRoundId === resolvedRoundId)
  const resultModalVisible = Boolean(resolvedRoundId && dismissedResultRoundId !== resolvedRoundId)
  const resultModalExiting = Boolean(resolvedRoundId && exitingResultRoundId === resolvedRoundId)
  const cardIsOnTable = Boolean(lobby.round && lobby.roundState && (lobby.round.phase !== 'resolved' || resultModalVisible))
  const hasSeenRoll = useRef(false)
  const previousRollId = useRef<string | undefined>(undefined)
  const hasSeenPosition = useRef(false)
  const previousPositionKey = useRef('')
  const hasSeenRound = useRef(false)
  const previousRound = useRef<{ id?: string; phase?: NonNullable<CompanionLobby['round']>['phase'] }>({})
  const coinKey = lobby.teams.map((team) => `${team.id}:${team.coins}`).join('|')
  const hasSeenCoins = useRef(false)
  const previousCoinKey = useRef('')

  useEffect(() => {
    const lastRollId = lobby.lastRollId
    if (!hasSeenRoll.current) {
      hasSeenRoll.current = true
      previousRollId.current = lastRollId
      return
    }
    if (lastRollId && previousRollId.current !== lastRollId) playSound('diceRoll')
    previousRollId.current = lastRollId
  }, [lobby.lastRollId, playSound])

  useEffect(() => {
    const positionKey = lobby.teams.map((team) => `${team.id}:${team.position}`).join('|')
    if (!hasSeenPosition.current) {
      hasSeenPosition.current = true
      previousPositionKey.current = positionKey
      return
    }
    if (positionKey === previousPositionKey.current) return

    previousPositionKey.current = positionKey
    const timeout = window.setTimeout(() => playSound('tokenMove'), 180)
    return () => window.clearTimeout(timeout)
  }, [lobby.teams, playSound])

  useEffect(() => {
    const nextRound = lobby.round ? { id: lobby.round.roundId, phase: lobby.round.phase } : {}
    const previous = previousRound.current
    previousRound.current = nextRound
    if (!hasSeenRound.current) {
      hasSeenRound.current = true
      return
    }
    if (nextRound.phase === 'answering' && previous.phase === 'awaiting_card') {
      playSound('cardReveal')
      return
    }
    if (!previous.id || previous.id !== nextRound.id) return
    if (previous.id === nextRound.id && previous.phase === nextRound.phase) return

    if (nextRound.phase === 'ready_to_reveal') playSound('answersReady')
    if (nextRound.phase === 'revealed') playSound('answersReveal')
    if (nextRound.phase !== 'resolved') return

    if (previous.phase !== 'revealed') playSound('answersReveal')
    const timeout = window.setTimeout(() => playSound(lobby.round?.result?.kind === 'tie' ? 'roundTie' : 'roundWon'), previous.phase === 'revealed' ? 0 : 420)
    return () => window.clearTimeout(timeout)
  }, [lobby.round, playSound])

  useEffect(() => {
    if (!hasSeenCoins.current) {
      hasSeenCoins.current = true
      previousCoinKey.current = coinKey
      return
    }
    if (coinKey !== previousCoinKey.current) playSound('coinPurchase')
    previousCoinKey.current = coinKey
  }, [coinKey, playSound])

  useEffect(() => {
    if (!resolvedRoundId || dismissedResultRoundId !== resolvedRoundId) return

    const exitTimeout = window.setTimeout(() => setExitingMetricsRoundId(resolvedRoundId), 5_400)
    const dismissTimeout = window.setTimeout(() => setDismissedMetricsRoundId(resolvedRoundId), 5_800)
    return () => {
      window.clearTimeout(exitTimeout)
      window.clearTimeout(dismissTimeout)
    }
  }, [dismissedResultRoundId, resolvedRoundId])

  useEffect(() => {
    if (!resolvedRoundId) return

    const exitTimeout = window.setTimeout(() => setExitingResultRoundId(resolvedRoundId), RESULT_MODAL_EXIT_MS)
    const dismissTimeout = window.setTimeout(() => setDismissedResultRoundId(resolvedRoundId), RESULT_MODAL_DISMISS_MS)
    return () => {
      window.clearTimeout(exitTimeout)
      window.clearTimeout(dismissTimeout)
    }
  }, [resolvedRoundId])

  return (
    <>
      <section className="w-full rounded-[2rem] border border-paper/20 bg-paper/8 p-4 text-left shadow-[0_24px_90px_rgb(0_0_0_/_0.22)] sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4 lg:px-2">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-mint">Sala {lobby.code} · partida en curso</p>
            <h1 className="mt-1 font-display text-3xl tracking-[-0.05em] lg:text-4xl">La mesa está servida.</h1>
          </div>
          <div className="flex items-center gap-2"><SoundControl enabled={soundEnabled} onClick={onToggleSound} /><DiceRoll dice={lobby.lastDice} value={lobby.lastRoll} /></div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.65rem] border border-paper/10 bg-ink/35">
          <BoardStrip lobby={lobby} dimmed={cardIsOnTable} />
        </div>

        {lobby.round && !cardIsOnTable ? <RoundStatus lobby={lobby} /> : null}
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
      {cardIsOnTable && lobby.round && lobby.roundState ? <ActiveCardModal exiting={resultModalExiting} round={lobby.round} state={lobby.roundState} teams={lobby.teams} /> : null}
      {metricsToastVisible && lobby.round ? <MetricsToast key={resolvedRoundId} category={lobby.round.category} exiting={metricsToastExiting} teams={lobby.teams} /> : null}
    </>
  )
}

function DiceRoll({ dice, value }: { dice?: { first: number; second: number }; value?: number }) {
  return <p aria-live="polite" aria-label={dice ? `Tirada: ${dice.first} más ${dice.second}, total ${value}` : 'Todavía no hubo Tirada'} className="flex items-center gap-1.5 rounded-full bg-saffron px-3 py-1.5 text-sm font-black text-ink"><span className="mr-0.5 text-ink/70">Tirada</span>{dice ? <><span className="companion-dice-roll grid h-7 w-7 place-items-center rounded-lg bg-paper text-ink shadow-[0_2px_0_rgb(0_0_0_/_0.22)]">{dice.first}</span><span className="companion-dice-roll grid h-7 w-7 place-items-center rounded-lg bg-paper text-ink shadow-[0_2px_0_rgb(0_0_0_/_0.22)]">{dice.second}</span><span className="text-ink/55">=</span></> : null}<span key={value ?? 'empty'} className="grid h-7 min-w-7 place-items-center rounded-lg bg-ink px-1 text-paper shadow-[0_2px_0_rgb(0_0_0_/_0.22)]">{value ?? '—'}</span></p>
}

function RoundStatus({ lobby }: { lobby: CompanionLobby }) {
  const round = lobby.round!
  const next = useMemo(() => ({
    category: round.phase === 'choose_category' ? 'Inicio' : CATEGORY_LABELS[round.category],
    key: [round.roundId, round.phase, round.targetId, round.wager, round.result?.winnerTeamIds.join(',')].join(':'),
    message: roundMessage(round, lobby.teams),
    phase: round.phase,
    wager: round.wager,
    maxBet: round.maxBet,
  }), [lobby.teams, round])
  const [displayed, setDisplayed] = useState(next)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    if (next.key === displayed.key) return

    const frame = window.requestAnimationFrame(() => setIsLeaving(true))
    const replaceTimeout = window.setTimeout(() => {
      setDisplayed(next)
      setIsLeaving(false)
    }, 180)

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(replaceTimeout)
    }
  }, [displayed.key, next])

  return <div aria-live="polite" className={`mt-5 rounded-2xl bg-paper p-4 text-ink sm:flex sm:items-center sm:justify-between sm:gap-6 ${isLeaving ? 'companion-step-exit' : 'companion-step-enter'}`}>
    <div>
      <p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-coral">Ronda actual · {displayed.category}</p>
      <p className="mt-1 font-display text-2xl tracking-[-0.05em] sm:text-3xl">{displayed.message}</p>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-0">
      <p className="rounded-full bg-ink px-4 py-2 text-sm font-black text-paper">{displayed.wager ? `$${displayed.wager} en juego` : `tope $${displayed.maxBet}`}</p>
    </div>
  </div>
}

function ActiveCardModal({ exiting, round, state, teams }: { exiting: boolean; round: NonNullable<CompanionLobby['round']>; state: NonNullable<CompanionLobby['roundState']>; teams: CompanionLobby['teams'] }) {
  const isResult = round.phase === 'resolved'
  return <div aria-label={isResult ? 'Resultado de la ronda' : 'Tarjeta en juego'} aria-modal="true" className="companion-card-backdrop fixed inset-0 z-50 grid place-items-center bg-ink/80 px-3 py-4 backdrop-blur-md sm:px-8 sm:py-8" role="dialog"><div key={`${round.roundId}:${round.phase}`} className={`${exiting ? 'companion-card-exit' : 'companion-card-enter'} max-h-full w-full max-w-5xl overflow-y-auto rounded-[2rem]`}><QuestionPanel round={round} state={state} teams={teams} /></div></div>
}

function BoardStrip({ lobby, dimmed }: { lobby: CompanionLobby; dimmed: boolean }) {
  return <Board3D activeTeamId={lobby.turnTeamId} board={lobby.board} dice={lobby.lastDice} dimmed={dimmed} rollId={lobby.lastRollId} teams={lobby.teams} />
}

function MetricsToast({ category, teams, exiting }: { category: keyof typeof CATEGORY_LABELS; teams: CompanionLobby['teams']; exiting: boolean }) {
  const categoryAttempts = teams.reduce((total, team) => total + team.categoryStats[category].attempts, 0)
  const categoryWins = teams.reduce((total, team) => total + team.categoryStats[category].wins, 0)
  const tableEffectiveness = categoryAttempts ? Math.round(categoryWins / categoryAttempts * 100) : 0

  return <aside aria-live="polite" className={`fixed bottom-4 right-4 z-40 w-[min(26rem,calc(100vw-2rem))] rounded-[1.5rem] border border-mint/35 bg-ink/95 p-4 text-left text-paper shadow-[0_18px_55px_rgb(0_0_0_/_0.5)] backdrop-blur-md sm:bottom-6 sm:right-6 ${exiting ? 'companion-toast-exit' : 'companion-toast-enter'}`}><div className="flex items-baseline justify-between gap-3"><div><p className="text-[0.58rem] font-black uppercase tracking-[0.2em] text-mint">Ritmo y precisión</p><p className="mt-1 font-display text-xl tracking-[-0.04em]">{CATEGORY_LABELS[category]}</p></div><p className="rounded-full bg-mint px-3 py-1.5 text-xs font-black text-ink">Mesa · {tableEffectiveness}%</p></div><p className="mt-3 text-xs font-semibold text-paper/65">Efectividad: rondas ganadas sobre respondidas en esta categoría.</p><div className="mt-3 grid grid-cols-2 gap-2">{teams.map((team) => { const stats = team.categoryStats[category]; const effectiveness = stats.attempts ? Math.round(stats.wins / stats.attempts * 100) : null; const averageSeconds = stats.attempts ? Math.round(stats.totalResponseMs / stats.attempts / 1000) : null; return <div key={team.id} className="min-w-0 rounded-xl bg-paper/8 px-3 py-2"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: team.color }} /><p className="truncate text-sm font-bold">{team.name}</p></div><div className="mt-1.5 flex items-baseline justify-between gap-2"><p className="text-sm font-black text-saffron">{effectiveness === null ? '—' : `${effectiveness}%`}</p><p className="text-xs text-paper/65">{stats.wins}/{stats.attempts} · {averageSeconds === null ? '—' : `${averageSeconds}s`}</p></div></div> })}</div></aside>
}

function QuestionPanel({ round, state, teams }: { round: NonNullable<CompanionLobby['round']>; state: NonNullable<CompanionLobby['roundState']>; teams: CompanionLobby['teams'] }) {
  const card = state.card
  const heading = card.category === 'sequence' || card.category === 'association' ? card.instruction : card.category === 'common' ? '¿Qué tienen en común?' : card.prompt
  const isResult = round.phase === 'resolved'

  return <section className="mx-auto max-w-3xl rounded-[2rem] border-[3px] border-ink/15 bg-paper p-5 text-left text-ink shadow-[0_28px_80px_rgb(0_0_0_/_0.5)] sm:p-7 lg:max-w-5xl lg:p-8 xl:p-10">
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/12 pb-4">
      <p className={`rounded-full px-3 py-1 text-[0.6rem] font-black uppercase tracking-[0.18em] ${CARD_CATEGORY_CLASS[card.category]}`}>{isResult ? 'Resultado · ' : 'Tarjeta en mesa · '}{CATEGORY_LABELS[card.category]}</p>
      <p className="text-xs font-bold text-ink/60">{state.responseCount}/{state.requiredResponseCount} respuestas</p>
    </div>
    <p className="mt-5 font-display text-3xl leading-[0.95] tracking-[-0.055em] sm:text-4xl lg:text-5xl">{heading}</p>
    {card.category === 'sequence' ? <div className="mt-5 flex flex-wrap gap-2">{card.items.map((item) => <span key={item} className="rounded-full bg-ink/8 px-3 py-1.5 text-sm font-bold sm:px-4 sm:py-2">{item}</span>)}</div> : null}
    {card.category === 'association' ? <div className="mt-5 grid grid-cols-2 gap-2 text-sm font-bold sm:gap-3 sm:text-base">{card.leftItems.map((item) => <span key={item} className="rounded-xl bg-ink/8 px-3 py-2.5">{item}</span>)}{card.rightItems.map((item) => <span key={item} className="rounded-xl bg-ink/8 px-3 py-2.5">{item}</span>)}</div> : null}
    {card.category === 'common' ? <div className="mt-5 flex flex-wrap gap-2">{card.clues.map((clue) => <span key={clue} className="rounded-full bg-ink/8 px-3 py-1.5 text-sm font-bold sm:px-4 sm:py-2">{clue}</span>)}</div> : null}
    {isResult ? <ResultBanner lobbyRound={round} teams={teams} /> : null}
    {round.phase === 'revealed' || isResult ? <RevealPanel card={card} answers={state.revealedResponses ?? []} /> : <p className="mt-5 text-sm font-semibold text-ink/55">Las respuestas siguen privadas hasta la revelación.</p>}
  </section>
}

function ResultBanner({ lobbyRound, teams }: { lobbyRound: NonNullable<CompanionLobby['round']>; teams: CompanionLobby['teams'] }) {
  const result = lobbyRound.result
  if (!result) return null
  if (result.kind === 'tie') return <div className="mt-5 rounded-2xl bg-saffron px-4 py-3 text-ink"><p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">Resultado</p><p className="mt-1 font-display text-2xl tracking-[-0.04em]">Empate: las apuestas quedan intactas.</p></div>

  const winnerNames = result.winnerTeamIds.map((teamId) => teams.find((team) => team.id === teamId)?.name).filter((name): name is string => Boolean(name))
  const winners = winnerNames.length > 1 ? `${winnerNames.slice(0, -1).join(', ')} y ${winnerNames.at(-1)}` : winnerNames[0] ?? 'El equipo ganador'
  const message = winnerNames.length > 1 ? `Ganaron ${winners} · $${result.payout} para cada equipo.` : `Ganó ${winners} · cobra $${result.payout}.`

  return <div className="mt-5 rounded-2xl bg-saffron px-4 py-3 text-ink"><p className="text-[0.6rem] font-black uppercase tracking-[0.18em] text-ink/60">Resultado</p><p className="mt-1 font-display text-2xl tracking-[-0.04em]">{message}</p></div>
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

function roundMessage(round: NonNullable<CompanionLobby['round']>, teams: CompanionLobby['teams']) {
  const challenger = teams.find((team) => team.id === round.challengerId)?.name ?? 'El retador'
  const target = round.targetId ? teams.find((team) => team.id === round.targetId)?.name : undefined

  if (round.phase === 'choose_rival') return `${challenger} elige rival.`
  if (round.phase === 'choose_category') return `${challenger} elige una categoría de Inicio.`
  if (round.phase === 'choose_bet') return `${challenger} apuesta contra ${target ?? 'su rival'}.`
  if (round.phase === 'awaiting_card') return `${challenger} va a sacar una tarjeta.`
  if (round.phase === 'answering') return `${challenger} vs. ${target ?? 'su rival'}: respuestas en curso.`
  if (round.phase === 'ready_to_reveal') return 'Todas las respuestas están listas.'
  if (round.phase === 'resolved') return 'Ronda resuelta.'
  return 'Tarjeta revelada.'
}

type CompanionLobby = {
  board: Array<{ category: 'sequence' | 'association' | 'common' | 'approximation'; isShop: boolean; maxBet: number }>
  code: string
  lastDice?: { first: number; second: number }
  lastRoll?: number
  lastRollId?: string
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
  teams: Array<{ answeredCards: number; categoryStats: Record<keyof typeof CATEGORY_LABELS, { attempts: number; wins: number; totalResponseMs: number }>; coins: number; color: string; correctMarks: number; id: Id<'teams'>; isHost: boolean; joinIndex: number; money: number; name: string; position: number; status: 'connected' | 'eliminated'; totalResponseMs: number }>
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
