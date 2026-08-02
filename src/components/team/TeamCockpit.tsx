type TeamCockpitProps = {
  lobby: {
    self: { name: string; color: string; money: number; coins: number; isHost: boolean }
    turnTeamId: string
    teams: Array<{ id: string; name: string; color: string; money: number; coins: number }>
  }
  isMyTurn: boolean
}

export function TeamCockpit({ lobby, isMyTurn }: TeamCockpitProps) {
  const currentTurnTeam = lobby.teams.find((team) => team.id === lobby.turnTeamId)

  return (
    <div className="rounded-2xl border border-ink/15 bg-paper p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: lobby.self.color }} />
          <span className="font-black text-ink">{lobby.self.name}</span>
          {lobby.self.isHost ? (
            <span className="text-[0.6rem] font-black uppercase tracking-wider text-coral">Anfitrión</span>
          ) : null}
        </div>
        <div className="flex items-center gap-3 font-mono text-sm font-bold">
          <span className="text-ink">${lobby.self.money}</span>
          <span className="text-saffron-dark font-black">🪙 {lobby.self.coins}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-ink/10 pt-2 text-xs">
        <span className="font-semibold text-ink/60">
          {isMyTurn ? '¡Es tu turno!' : `Turno de ${currentTurnTeam?.name ?? 'otro equipo'}`}
        </span>
        <span className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: isMyTurn ? lobby.self.color : '#94a3b8' }} />
      </div>
    </div>
  )
}
