import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type TeamSession = {
  token: string
}

type SessionState = {
  teamsByRoom: Record<string, TeamSession>
  saveTeamSession: (roomCode: string, session: TeamSession) => void
  clearTeamSession: (roomCode: string) => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      teamsByRoom: {},
      saveTeamSession: (roomCode, session) =>
        set((state) => ({
          teamsByRoom: { ...state.teamsByRoom, [roomCode]: session },
        })),
      clearTeamSession: (roomCode) =>
        set((state) => {
          const teamsByRoom = { ...state.teamsByRoom }
          delete teamsByRoom[roomCode]
          return { teamsByRoom }
        }),
    }),
    { name: 'eras-erudito-session' },
  ),
)
