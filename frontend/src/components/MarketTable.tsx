import type { Market } from '../types'

interface MarketTableProps {
  markets: Market[]
}

export function MarketTable({ markets }: MarketTableProps) {
  if (markets.length === 0) {
    return (
      <p style={{ color: '#888' }}>
        No markets loaded. Set VITE_API_URL and run the backend, or use mock data.
      </p>
    )
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            <th>Event</th>
            <th>Question</th>
            <th>Volume</th>
            <th>Slug</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((m) => (
            <tr key={m.conditionId}>
              <td>{m.event_title}</td>
              <td>{m.question}</td>
              <td>${typeof m.volume === 'number' ? m.volume.toLocaleString(undefined, { minimumFractionDigits: 2 }) : m.volume}</td>
              <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{m.slug}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
