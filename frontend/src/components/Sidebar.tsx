import type { Market } from '../types'

interface SidebarProps {
  events: string[]
  marketsByEvent: Record<string, Market[]>
  selectedEvent: string
  selectedMarket: string
  onEventChange: (event: string) => void
  onMarketChange: (conditionId: string) => void
  onAnalyze: () => void
  analyzing: boolean
  searchSlug: string
  onSearchSlugChange: (v: string) => void
}

export function Sidebar({
  events,
  marketsByEvent,
  selectedEvent,
  selectedMarket,
  onEventChange,
  onMarketChange,
  onAnalyze,
  analyzing,
  searchSlug,
  onSearchSlugChange,
}: SidebarProps) {
  const markets = marketsByEvent[selectedEvent] || []
  const useSearch = searchSlug.trim().length > 0

  return (
    <aside
      style={{
        width: '280px',
        minWidth: '280px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Market Configuration</h3>

      <label style={{ fontSize: '0.9rem' }}>
        Search by slug
        <input
          type="text"
          placeholder="e.g. will-bitcoin-hit-100k"
          value={searchSlug}
          onChange={(e) => onSearchSlugChange(e.target.value)}
          style={{ marginTop: '0.25rem' }}
        />
      </label>

      {!useSearch && (
        <>
          <label style={{ fontSize: '0.9rem' }}>
            Step 1: Select Event
            <select
              value={selectedEvent}
              onChange={(e) => onEventChange(e.target.value)}
              style={{ marginTop: '0.25rem' }}
            >
              {events.map((ev) => (
                <option key={ev} value={ev}>{ev}</option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.9rem' }}>
            Step 2: Select Market
            <select
              value={selectedMarket}
              onChange={(e) => onMarketChange(e.target.value)}
              style={{ marginTop: '0.25rem' }}
            >
              {markets.map((m) => (
                <option key={m.conditionId} value={m.conditionId}>
                  {m.question}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
        {useSearch ? 'Analyzing 1 market (slug)' : `Analyzing 1 market(s)`}
      </p>
      <button
        type="button"
        className="primary"
        onClick={onAnalyze}
        disabled={analyzing}
        style={{ marginTop: 'auto' }}
      >
        {analyzing ? 'Analyzing…' : 'Analyze Market'}
      </button>
    </aside>
  )
}
