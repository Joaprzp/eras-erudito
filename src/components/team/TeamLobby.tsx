import type { Id } from '../../../convex/_generated/dataModel'
import { MAX_TEAMS } from '../../../convex/constants'

type TeamLobbyProps = {
  lobby: {
    self: { id: string; isHost: boolean }
    teams: Array<{ id: Id<'teams'>; name: string; color: string; isHost: boolean }>
  }
  error: string | null
  pendingAction: string | null
  onStart: () => void
  onLeave: () => void
  onRemove: (teamId: Id<'teams'>) => void
  timerEnabled?: boolean
  onToggleTimer?: () => void
}

export function TeamLobby({
  lobby,
  error,
  pendingAction,
  timerEnabled,
  onStart,
  onLeave,
  onRemove,
  onToggleTimer,
}: TeamLobbyProps) {
  const isHost = lobby.self.isHost

  return (
    <section className="mt-7 rounded-[1.8rem] border-2 border-ink p-5 text-left bg-paper">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ink/60">Sala</p>
        <p className="text-sm font-black">{lobby.teams.length}/{MAX_TEAMS}</p>
      </div>

      <p className="mt-2 text-sm font-semibold text-ink/60">
        {lobby.teams.length < 2
          ? 'Falta al menos un equipo para empezar.'
          : lobby.teams.length < MAX_TEAMS
            ? `Pueden entrar ${MAX_TEAMS - lobby.teams.length} equipos más.`
            : 'La mesa está completa.'}
      </p>

      <div className="mt-4 space-y-2">
        {lobby.teams.map((team) => (
          <div key={team.id} className="flex items-center gap-3 rounded-xl bg-ink/6 px-3 py-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
            <span className="font-semibold">{team.name}</span>
            {team.isHost ? (
              <span className="ml-auto text-[0.58rem] font-bold uppercase tracking-[0.15em] text-coral">anfitrión</span>
            ) : null}
            {isHost && team.id !== lobby.self.id ? (
              <button
                type="button"
                disabled={Boolean(pendingAction)}
                className="ml-auto text-xs font-bold underline underline-offset-4 disabled:opacity-35"
                onClick={() => onRemove(team.id)}
              >
                {pendingAction === 'remove' ? 'Quitando…' : 'Quitar'}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {isHost ? (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-ink/5 p-3">
          <div>
            <p className="text-xs font-bold text-ink">Temporizador de Aproximación (45s)</p>
            <p className="text-[0.65rem] font-medium text-ink/60">Auto-completa con "0" al expirar</p>
          </div>
          <button
            type="button"
            disabled={Boolean(pendingAction)}
            onClick={onToggleTimer}
            className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider transition-colors ${
              timerEnabled ? 'bg-mint text-ink' : 'bg-paper/20 text-ink/50 border border-ink/20'
            }`}
          >
            {timerEnabled ? 'Activo' : 'Inactivo'}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl bg-coral/20 px-3 py-2 text-sm font-semibold text-coral">{error}</p>
      ) : null}

      <div className="mt-6 grid gap-2">
        {isHost ? (
          <button
            type="button"
            disabled={lobby.teams.length < 2 || Boolean(pendingAction)}
            className="min-h-12 rounded-full bg-ink px-5 py-3 text-sm font-black text-paper disabled:cursor-not-allowed disabled:opacity-35"
            onClick={onStart}
          >
            {pendingAction === 'start'
              ? 'Iniciando…'
              : lobby.teams.length < 2
                ? 'Esperando otro equipo'
                : 'Iniciar partida'}
          </button>
        ) : (
          <p className="rounded-xl bg-mint/25 px-3 py-3 text-sm font-semibold text-center">
            Esperando que {lobby.teams[0]?.name ?? 'el anfitrión'} inicie.
          </p>
        )}

        <button
          type="button"
          disabled={Boolean(pendingAction)}
          className="min-h-12 rounded-full border border-ink/30 px-5 py-3 text-sm font-bold disabled:opacity-35"
          onClick={onLeave}
        >
          {pendingAction === 'leave' ? 'Saliendo…' : 'Salir de la sala'}
        </button>
      </div>
    </section>
  )
}
