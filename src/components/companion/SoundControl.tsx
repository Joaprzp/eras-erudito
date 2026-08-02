type SoundControlProps = {
  enabled: boolean
  onClick: () => void
}

export function SoundControl({ enabled, onClick }: SoundControlProps) {
  return (
    <button
      type="button"
      className="flex h-9 items-center gap-1.5 rounded-full border border-paper/20 bg-paper/10 px-3 text-xs font-black uppercase tracking-wider text-paper transition-transform active:scale-95 hover:bg-paper/20"
      onClick={onClick}
    >
      <span>{enabled ? '🔊' : '🔇'}</span>
      <span className="hidden sm:inline">{enabled ? 'Sonido ON' : 'Sonido OFF'}</span>
    </button>
  )
}
