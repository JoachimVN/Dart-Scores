interface ScoreDisplayEntry {
  id: string
  name: string
  remaining: number
}

interface ScoreDisplayProps {
  players: ScoreDisplayEntry[]
  currentPlayerId: string
  /** Player whose turn just ended in a bust, highlighted briefly until their next throw. */
  bustedPlayerId?: string | null
}

export function ScoreDisplay({ players, currentPlayerId, bustedPlayerId }: ScoreDisplayProps) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35em' }}>
      {players.map((player) => {
        const isActive = player.id === currentPlayerId
        const isBusted = player.id === bustedPlayerId
        return (
          <li
            key={player.id}
            title={isBusted ? `${player.name} - bust!` : player.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '2em',
              padding: '0.3em 0.5em',
              borderRadius: '0.5em',
              background: isBusted ? '#fdecea' : 'var(--bg)',
              border: isBusted ? '2px solid #c62828' : isActive ? '2px solid currentColor' : '1px solid var(--border)',
              color: isBusted ? '#c62828' : 'inherit',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {player.remaining}
          </li>
        )
      })}
    </ul>
  )
}
