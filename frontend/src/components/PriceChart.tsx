interface PriceChartProps {
  data: { timestamp: string; price: number }[]
  height?: number
}

export function PriceChart({ data, height = 400 }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-card)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          color: '#888',
        }}
      >
        No price data
      </div>
    )
  }

  const prices = data.map((d) => d.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const padding = 24
  const w = 800
  const h = height - padding * 2
  const points = data
    .map((d, i) => {
      const x = padding + (i / (data.length - 1 || 1)) * (w - padding * 2)
      const y = padding + h - ((d.price - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        padding: '1rem',
        overflowX: 'auto',
      }}
    >
      <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', minWidth: 400, height }}>
        <polyline
          fill="none"
          stroke="url(#chartGradient)"
          strokeWidth="2"
          points={points}
        />
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent-start)" />
            <stop offset="100%" stopColor="var(--accent-end)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}
