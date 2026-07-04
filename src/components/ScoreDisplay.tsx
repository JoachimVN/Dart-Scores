interface ScoreDisplayEntry {
  id: string
  name: string
  remaining: number
}

interface ScoreDisplayProps {
  players: ScoreDisplayEntry[]
  currentPlayerId: string
}

export function ScoreDisplay({ players, currentPlayerId }: ScoreDisplayProps) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5em' }}>
      {players.map((player) => {
        const isActive = player.id === currentPlayerId
        return (
          <li
            key={player.id}
            title={player.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '2em',
              padding: '0.4em 0.6em',
              borderRadius: '0.5em',
              background: 'var(--bg)',
              border: isActive ? '2px solid currentColor' : '1px solid var(--border)',
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
