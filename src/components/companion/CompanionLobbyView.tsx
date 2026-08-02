import { QRCodeSVG } from 'qrcode.react'
import { MAX_TEAMS } from '../../../convex/constants'

type CompanionLobbyViewProps = {
  lobby: {
    code: string
    teams: Array<{ id: string; name: string; color: string; isHost: boolean }>
  }
  joinUrl: string
}

export function CompanionLobbyView({ lobby, joinUrl }: CompanionLobbyViewProps) {
  return (
    <div className="mt-8 grid gap-6 rounded-3xl border border-paper/20 bg-paper/8 p-6 text-left sm:grid-cols-[1fr_auto]">
      <div>
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-saffron">Código para equipos</p>
        <p className="mt-2 font-display text-6xl tracking-[0.1em]">{lobby.code}</p>
        <p className="mt-7 text-sm text-paper/60">{lobby.teams.length}/{MAX_TEAMS} equipos en espera</p>

        <div className="mt-4 space-y-2">
          {lobby.teams.map((team) => (
            <div key={team.id} className="flex items-center gap-3 rounded-xl bg-paper/8 px-3 py-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
              <span className="font-semibold">{team.name}</span>
              {team.isHost ? (
                <span className="ml-auto text-[0.6rem] font-bold uppercase tracking-[0.16em] text-mint">anfitrión</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div className="self-start rounded-2xl bg-paper p-3">
        <QRCodeSVG value={joinUrl} size={132} bgColor="#f7efd9" fgColor="#21160f" level="M" includeMargin />
      </div>
    </div>
  )
}
