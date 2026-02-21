interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
}

export function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <div className="metric-card">
      <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', color: '#aaa' }}>
        {title}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value}</div>
      {subtitle != null && (
        <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}
