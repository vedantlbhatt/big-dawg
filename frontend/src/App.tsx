import { useState, useRef, useEffect } from 'react'
import { fetchMarkets, analyzeMarket, cancelMarketsFetch, chat as apiChat } from './api'
import LandingPage from './LandingPage'
import type { Market, AnalysisResult, PredictiveInsights } from './types'

type Page = 'landing' | 'markets' | 'analysis'

const API_BASE = import.meta.env.VITE_API_URL || ''
const RING_CIRCUMFERENCE = 364.4

function trustClass(score: number): 'trust' | 'caution' | 'risk' {
  if (score >= 60) return 'trust'
  if (score >= 40) return 'caution'
  return 'risk'
}

const RadarChartSVG = ({ scores, size = 60 }: { scores: { wallet: number; integrity: number; info: number; conf: number }; size?: number }) => {
  const center = size / 2;
  const radius = (size / 2) - 12;

  // Axes: 0: Top (Wallet), 1: Right (Integrity), 2: Bottom (Info), 3: Left (Quality)
  const points = [
    { x: center, y: center - radius * (scores.wallet || 0) },
    { x: center + radius * (scores.integrity || 0), y: center },
    { x: center, y: center + radius * (scores.info || 0) },
    { x: center - radius * (scores.conf || 0), y: center },
  ];

  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const labelDist = radius + 6;
  const labels = [
    { text: 'Wal', x: center, y: center - labelDist },
    { text: 'Int', x: center + labelDist + 4, y: center + 3 },
    { text: 'Inf', x: center, y: center + labelDist + 6 },
    { text: 'Qual', x: center - labelDist - 4, y: center + 3 }
  ];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Background Grid */}
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border2)" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="var(--border2)" strokeWidth="0.5" strokeDasharray="1,1" />
      <line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="var(--border2)" strokeWidth="0.5" strokeDasharray="1,1" />

      {/* Radar Shape */}
      <polygon
        points={polygonPoints}
        fill="rgba(185, 247, 81, 0.25)"
        stroke="var(--lime)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--lime)" />
      ))}
      {/* Labels if size large */}
      {size > 100 && labels.map((l, i) => (
        <text key={i} x={l.x} y={l.y} textAnchor="middle" fontSize="7" fontWeight="900" fill="var(--text3)" style={{ textAnchor: 'middle', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l.text}</text>
      ))}
    </svg>
  );
};

// Light smoothing so the line looks like a regular graph, not step/blocky (Polymarket-style)
function smoothPrices(prices: number[], window = 3): number[] {
  if (prices.length < window) return prices
  const out: number[] = []
  const half = Math.floor(window / 2)
  for (let i = 0; i < prices.length; i++) {
    let sum = 0
    let count = 0
    for (let k = i - half; k <= i + half; k++) {
      if (k >= 0 && k < prices.length) {
        sum += prices[k]
        count++
      }
    }
    out.push(sum / count)
  }
  return out
}

// Build smooth cubic Bezier path (Catmull-Rom); use with smoothed data for a fluid line
function smoothPathThroughPoints(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[Math.min(pts.length - 1, i + 2)]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`
  }
  return d
}

function formatChartDate(ts: string): string {
  const d = new Date(ts)
  if (isNaN(d.getTime())) return ts
  const mon = d.toLocaleDateString('en-US', { month: 'short' })
  const day = d.getDate()
  const year = d.getFullYear()
  const thisYear = new Date().getFullYear()
  return year !== thisYear ? `${mon} ${day}, ${year}` : `${mon} ${day}`
}

function PriceChartSVG({ priceSeries, currentPct }: { priceSeries: { timestamp: string; price: number }[]; currentPct: number }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hovered, setHovered] = useState<{ index: number; x: number; y: number } | null>(null)

  const w = 600
  const h = 160
  const padding = { left: 38, right: 22, top: 20, bottom: 20 }
  const plotH = h - padding.top - padding.bottom
  const plotW = w - padding.left - padding.right

  // Normalized Y scale: enforce minimum range so 2% data doesn't fill the whole graph (Polymarket-style)
  const MIN_RANGE = 0.10 // 10% minimum vertical range
  let minP = 0
  let maxP = 1

  // Smoothed prices for drawing (less blocky/static); scale Y from smoothed so line fits
  const smoothedPrices = priceSeries.length >= 2
    ? smoothPrices(priceSeries.map((d) => d.price), 5)
    : []
  if (priceSeries.length >= 2 && smoothedPrices.length > 0) {
    const rawMin = Math.min(...smoothedPrices)
    const rawMax = Math.max(...smoothedPrices)
    const dataRange = rawMax - rawMin
    const halfRange = Math.max(dataRange / 2, MIN_RANGE / 2)
    const center = (rawMin + rawMax) / 2
    minP = Math.max(0, center - halfRange)
    maxP = Math.min(1, center + halfRange)
  }

  const range = maxP - minP || 1
  const pts = priceSeries.length >= 2
    ? priceSeries.map((d, i) => ({
      x: padding.left + (i / (priceSeries.length - 1)) * plotW,
      y: padding.top + (1 - ((smoothedPrices[i] ?? d.price) - minP) / range) * plotH
    }))
    : []

  const linePath = smoothPathThroughPoints(pts)
  const areaPath = pts.length >= 2 ? linePath + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z` : ''
  const lastX = pts.length >= 2 ? pts[pts.length - 1].x : padding.left
  const lastY = pts.length >= 2 ? pts[pts.length - 1].y : h / 2

  // Real date labels for X-axis (first, 1/4, 1/2, 3/4, last)
  const xLabels: { x: number; label: string }[] = []
  if (priceSeries.length >= 2) {
    const indices = [0, Math.floor(priceSeries.length * 0.25), Math.floor(priceSeries.length * 0.5), Math.floor(priceSeries.length * 0.75), priceSeries.length - 1]
    const uniq = [...new Set(indices)]
    uniq.forEach((i) => {
      const ts = priceSeries[i]?.timestamp
      xLabels.push({
        x: padding.left + (i / (priceSeries.length - 1)) * plotW,
        label: ts ? formatChartDate(ts) : (i === 0 ? 'Start' : i === priceSeries.length - 1 ? 'Now' : '')
      })
    })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const svg = svgRef.current
    if (!svg || priceSeries.length < 2) return
    const rect = svg.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * w
    const relX = (x - padding.left) / plotW
    const index = Math.round(relX * (priceSeries.length - 1))
    const i = Math.max(0, Math.min(index, priceSeries.length - 1))
    const point = priceSeries[i]
    const px = padding.left + (i / (priceSeries.length - 1)) * plotW
    const py = padding.top + (1 - (point.price - minP) / range) * plotH
    setHovered({ index: i, x: px, y: py })
  }

  const handleMouseLeave = () => setHovered(null)

  // Dynamic ticks from normalized range
  const ticks = [maxP, maxP - (range * 0.33), maxP - (range * 0.66), minP]

  const displayPoint = hovered !== null ? priceSeries[hovered.index] : null

  return (
    <div
      className="price-chart-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', width: '100%', height: '100%' }}
    >
      <svg ref={svgRef} className="price-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b9f751" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#b9f751" stopOpacity={0} />
          </linearGradient>
        </defs>
        <g className="c-grid">
          {ticks.map((_, i) => (
            <line key={i} x1="0" y1={padding.top + (i / 3) * plotH} x2={w} y2={padding.top + (i / 3) * plotH} />
          ))}
        </g>
        <g className="c-axis">
          {ticks.map((t, i) => (
            <text key={i} x="2" y={padding.top + (i / 3) * plotH + 3}>{Math.round(t * 100)}%</text>
          ))}
        </g>
        <g className="c-axis c-axis-time">
          {xLabels.map(({ x, label }, i) => (
            <text key={i} x={x} y={h - 4} textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}>{label}</text>
          ))}
        </g>
        {pts.length >= 2 && (
          <>
            <path className="c-area" d={areaPath} />
            <path className="c-line" d={linePath} />
            {/* Single prominent point at current value (Polymarket-style); show dot on hover */}
            {hovered !== null && (
              <circle cx={pts[hovered.index].x} cy={pts[hovered.index].y} r="4" fill="#b9f751" className="c-dot c-dot-hover" />
            )}
            <circle cx={lastX} cy={lastY} r="4" fill="#b9f751" className="c-last" />
            <circle cx={lastX} cy={lastY} r="9" fill="#b9f751" opacity={0.14} />
            {displayPoint && hovered && (
              <g className="c-tooltip">
                {(() => {
                  const tw = 48
                  const th = 20
                  const tx = hovered.x + 6 > w - padding.right - tw ? hovered.x - tw - 6 : hovered.x + 6
                  const ty = hovered.y - 12
                  return (
                    <>
                      <rect x={tx} y={ty} width={tw} height={th} rx="6" fill="rgba(20,20,20,.9)" stroke="rgba(185,247,81,.4)" strokeWidth={0.5} />
                      <text x={tx + tw / 2} y={ty + th / 2 + 0.5} textAnchor="middle" fontSize="10" fill="#b9f751" fontFamily="Figtree" fontWeight="700">{Math.round(displayPoint.price * 100)}%</text>
                    </>
                  )
                })()}
              </g>
            )}
            {!displayPoint && (
              <>
                <rect x={lastX + 4} y={lastY - 10} width="32" height="15" rx="4" fill="rgba(185,247,81,.14)" stroke="rgba(185,247,81,.3)" strokeWidth={0.5} />
                <text x={lastX + 20} y={lastY - 0.5} textAnchor="middle" fontSize="8" fill="#b9f751" fontFamily="Figtree" fontWeight="700">{currentPct}%</text>
              </>
            )}
          </>
        )}
      </svg>
    </div>
  )
}

const PredictiveAlphaDashboard = ({ data, loading }: { data: PredictiveInsights | null; loading: boolean }) => {
  if (loading) return <div className="alpha-dashboard" style={{ padding: 40, textAlign: 'center', opacity: 0.5 }}>Computing 30-min market alpha drivers...</div>;
  if (!data || data.error) return null;

  const features = Object.entries(data.coefficients).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const featureMeta: Record<string, { primary: string; opposite: string }> = {
    whale_activity: { primary: 'Whale Activity', opposite: 'Retail Activity' },
    order_imbalance: { primary: 'Buy Pressure', opposite: 'Sell Pressure' },
    volatility: { primary: 'Volatility', opposite: 'Stability' },
  };

  return (
    <div className="alpha-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, position: 'relative', zIndex: 1 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em' }}>Alpha Engine v1</div>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: 'var(--text)', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>Real-time Alpha Analysis</h2>
          <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>Identifying behavioral signals driving 30-min price momentum across 12 markets.</p>
        </div>
      </div>

      <div className="alpha-grid">
        {features.map(([name, coef]) => {
          const absVal = Math.min(100, Math.abs(coef * 500));
          const level = Math.round(absVal);
          const inverseLevel = Math.max(0, 100 - level);
          const meta = featureMeta[name] ?? { primary: name.replace('_', ' '), opposite: `Inverse ${name.replace('_', ' ')}` };
          const primaryLabel = coef >= 0 ? meta.primary : meta.opposite;
          const oppositeLabel = coef >= 0 ? meta.opposite : meta.primary;
          return (
            <div key={name} className="alpha-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase' }}>{primaryLabel}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--lime)' }}>
                  ↑ {level}%
                </span>
              </div>
              <div className="alpha-influence-bar">
                <div
                  className="alpha-influence-fill"
                  style={{
                    width: `${level}%`,
                    background: 'var(--lime)',
                    boxShadow: '0 0 12px var(--lime)44'
                  }}
                />
              </div>
              <div style={{ marginTop: 8, fontSize: 9, fontWeight: 600, color: 'var(--text3)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{primaryLabel}: {level}%</span>
                <span>{oppositeLabel}: {inverseLevel}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--text3)', opacity: 0.6 }}>
          Sample Size: {data.sample_size} Markets
        </div>
      </div>
    </div >
  );
};

function App() {
  const [page, setPage] = useState<Page>('landing')
  const [overlayOn, setOverlayOn] = useState(false)
  const [apiMarkets, setApiMarkets] = useState<Market[]>([])
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [marketsError, setMarketsError] = useState<string | null>(null)
  const [stats, setStats] = useState<{ volume_tracked: string; live_markets: number; avg_analysis_time: string } | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [walletsExpanded, setWalletsExpanded] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [showInfoCard, setShowInfoCard] = useState(false)
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [visibleCount, setVisibleCount] = useState(20)
  const replyIdx = useRef(0)

  // Fetch global stats on mount
  useEffect(() => {
    if (!API_BASE) return
    fetch(`${API_BASE}/api/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
  }, [API_BASE])

  // Prefetch predictive insights early (landing/app load) so markets page feels instant
  useEffect(() => {
    if (!API_BASE || insightsLoading || predictiveInsights) return
    setInsightsLoading(true)
    fetch(`${API_BASE}/api/predictive_insights`)
      .then(res => res.json())
      .then(data => setPredictiveInsights(data))
      .catch(() => setPredictiveInsights(null))
      .finally(() => setInsightsLoading(false))
  }, [API_BASE, insightsLoading, predictiveInsights])

  // Debounced market fetching with cancellation support
  useEffect(() => {
    if (!API_BASE || page !== 'markets') return

    // Clear previous timer (but keep loading state if fetch is in progress)
    if (debounceTimer) clearTimeout(debounceTimer)

    // Set new timer
    setMarketsError(null)
    const timer = setTimeout(() => {
      setMarketsLoading(true)
      fetchMarkets(searchQuery || undefined)
        .then((list) => {
          setApiMarkets(list)
          setMarketsError(null)
        })
        .catch((e) => {
          const errMsg = e instanceof Error ? e.message : 'Failed to load markets'
          // Only show error if user didn't cancel
          if (!errMsg.includes('AbortError')) {
            setMarketsError(errMsg)
          }
          // Keep previous results visible on error
          if (apiMarkets.length === 0) {
            setApiMarkets([])
          }
        })
        .finally(() => {
          setMarketsLoading(false)
        })
    }, 300) // 300ms debounce

    setDebounceTimer(timer)

    return () => {
      clearTimeout(timer)
      // Don't clear searchCancellable here - let the fetch finish and cleanup naturally
    }
  }, [API_BASE, page, searchQuery])

  const go = (p: Page) => {
    setOverlayOn(true)
    setTimeout(() => {
      setPage(p)
      window.scrollTo(0, 0)
      setOverlayOn(false)
    }, 120)
  }

  const enterApp = () => {
    go('markets')
  }

  const handleCancelSearch = () => {
    cancelMarketsFetch()
    setMarketsLoading(false)
    setMarketsError(null)  // Clear error immediately instead of showing "Search cancelled"
  }

  const handleAnalyzeMarket = async (m: Market) => {
    setAnalysisError(null)
    setAnalyzing(true)
    setChatLoading(false)
    setSelectedMarket(m)
    go('analysis')
    try {
      const result = await analyzeMarket(m.slug || m.conditionId)
      setAnalysisResult(result)
      setChatMessages([])
      setChatLoading(false)
      replyIdx.current = 0
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const walletIntel = analysisResult?.wallet_intel ?? null

  const sendMsg = async () => {
    const val = chatInput.trim()
    if (!val || chatLoading) return
    setChatMessages((prev) => [...prev, { role: 'user', text: val }])
    setChatInput('')
    if (analysisResult) {
      try {
        setChatLoading(true)
        const history = chatMessages.map((m) => ({ role: m.role === 'user' ? 'human' : 'assistant', content: m.text }))
        const response = await apiChat(
          analysisResult.integrity_res,
          analysisResult.info_res,
          analysisResult.conf_res,
          val,
          history,
          {
            extraContext: {
              market_name: analysisResult.market_name,
              wallet_intel: analysisResult.wallet_intel ?? null,
              master_res: analysisResult.master_res,
              recommendation: analysisResult.recommendation ?? null,
              trades_count: analysisResult.trades_count,
              current_price: analysisResult.current_price ?? null,
              yes_vol: analysisResult.yes_vol ?? null,
              no_vol: analysisResult.no_vol ?? null,
              price_series_tail: (analysisResult.price_series ?? []).slice(-20),
              recent_trades: (analysisResult.trades ?? []).slice(-10),
            },
          }
        )
        setChatMessages((prev) => [...prev, { role: 'bot', text: response || '' }])
      } catch {
        setChatMessages((prev) => [...prev, { role: 'bot', text: 'Chat is unavailable. Set up the backend and GEMINI_API_KEY.' }])
      } finally {
        setChatLoading(false)
      }
    }
  }

  const marketSlug = analysisResult?.market_name ?? ''
  const displayMarketName = marketSlug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
  const trustScore = Math.round((analysisResult?.master_res?.overall_score ?? analysisResult?.integrity_res?.score ?? 0) * 100)
  const trustCls = trustClass(trustScore)
  const yesPct = Math.round((analysisResult?.conf_res?.probability ?? 0) * 100)

  const totalV = (analysisResult?.yes_vol || 0) + (analysisResult?.no_vol || 0)
  const sentimentYesPct = totalV > 0
    ? Math.round((analysisResult?.yes_vol || 0) / (totalV || 1) * 100)
    : 50 // Balanced fallback if no volume data yet
  const rec = analysisResult?.recommendation
  const aiRecommendationText = rec
    ? `${rec.action}${rec.action === 'HOLD / NEUTRAL' ? ' — no strong edge yet.' : ''}`
    : 'No recommendation yet.'

  return (
    <>
      <div className={`overlay ${overlayOn ? 'on' : ''}`} id="overlay" aria-hidden />

      {page !== 'landing' && (
        <nav className="nav" id="mainNav">
          <div className="nav-logo" onClick={() => go('markets')} role="button">
            <div className="logo-paw"><img src="/reddog-removebg-preview.png" alt="Big-Dawg" /></div>
            <span>Big<span className="logo-sup">-Dawg</span></span>
          </div>
          <div className="nav-crumb" id="navCrumb">
            <span className="crumb-item" onClick={() => go('markets')}>Markets</span>
            {analysisResult && (
              <>
                <span className="crumb-sep">/</span>
                <span className="crumb-item active">{(displayMarketName || '').slice(0, 28)}…</span>
              </>
            )}
          </div>
          <div className="nav-right">
            <div className="live-pill"><div className="live-dot" />Live</div>
          </div>
        </nav>
      )}

      {/* LANDING */}
      <div className={`page ${page === 'landing' ? 'on' : ''}`} id="landingPage">
        <LandingPage onBrowseMarkets={enterApp} stats={stats} />
      </div>

      {/* MARKETS — real from API (Polymarket + logic engine) or mock */}
      <div className={`page ${page === 'markets' ? 'on' : ''}`} id="marketsPage">
        <div className="events-hero">
          <div className="events-title">All <em>markets</em></div>
          <div className="events-sub">
            {apiMarkets.length > 0 ? `Live Polymarket data · ${apiMarkets.length} markets · Click to run logic-engine analysis.` : marketsError ? 'Could not load markets. Is the backend running?' : 'Loading markets from Polymarket…'}
          </div>
        </div>

        <PredictiveAlphaDashboard data={predictiveInsights} loading={insightsLoading} />
        {marketsError && API_BASE && (
          <div style={{ padding: '12px 28px', marginBottom: 8, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{marketsError}</span>
            {marketsLoading && <button type="button" onClick={handleCancelSearch} style={{ background: 'var(--red)', color: 'var(--bg)', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Cancel</button>}
          </div>
        )}
        {analysisError && (
          <div style={{ padding: '12px 28px', marginBottom: 8, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13 }}>{analysisError}</div>
        )}
        {marketsLoading && (
          <div style={{ padding: '12px 28px', marginBottom: 8, background: 'var(--lime-dim)', border: '1px solid var(--lime)', borderRadius: 12, color: 'var(--lime)', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{apiMarkets.length === 0 ? 'Searching markets…' : 'Updating results…'}</span>
            <button type="button" onClick={handleCancelSearch} style={{ background: 'var(--lime)', color: 'var(--bg)', border: 'none', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Cancel</button>
          </div>
        )}
        {apiMarkets.length > 0 && (
          <div style={{ padding: '12px 28px', marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border)',
                borderRadius: 8,
                background: 'var(--bg)',
                color: 'var(--text)',
                fontSize: 14
              }}
            />
          </div>
        )}
        <div className="bets-grid" style={{ padding: '0 28px 20px' }} id="marketsGrid">
          {apiMarkets.slice(0, visibleCount).map((m) => (
            <div
              key={m.conditionId + m.slug}
              className="bet-card"
              onClick={() => handleAnalyzeMarket(m)}
              role="button"
              tabIndex={0}
              onKeyDown={(ev) => ev.key === 'Enter' && handleAnalyzeMarket(m)}
            >
              <div className="bet-card-top">
                <div className="bet-card-title">
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>{m.event_title}</span>
                  {m.question}
                </div>
              </div>
              {(() => {
                const totalV = (m.yes_vol || 0) + (m.no_vol || 0)
                const yesPct = totalV > 0
                  ? Math.round((m.yes_vol || 0) / (totalV || 1) * 100)
                  : Math.round((m.current_price ?? 0.5) * 100)
                const noPct = 100 - yesPct
                const yesLab = m.yes_label && !['YES', 'PURCHASE YES'].includes(m.yes_label.toUpperCase()) ? m.yes_label.slice(0, 8) : 'YES'
                return (
                  <div className="trust-mini market-yn-bottom" style={{ width: '100%', gap: 5 }}>
                    <div style={{ width: '100%', height: 6, marginTop: 4, background: 'var(--red)', borderRadius: 3, overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: `${yesPct}%`, height: '100%', background: 'var(--lime)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 9, fontWeight: 800 }}>
                      <span style={{ color: 'var(--lime)', letterSpacing: '-0.02em' }}>{yesLab.toUpperCase()} {yesPct}%</span>
                      <span style={{ color: 'var(--red)', letterSpacing: '-0.02em' }}>NO {noPct}%</span>
                    </div>
                    <div className="tmini-lbl" style={{ fontSize: 7, marginTop: 0 }}>{totalV > 0 ? 'Volume Sentiment' : 'Price Sentiment'}</div>
                  </div>
                )
              })()}
              <div className="bet-foot">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Vol ${typeof m.volume === 'number' ? m.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : m.volume}</span>
                </div>
                {m.classification && (
                  <div className="smart-lean-chip" style={{ background: m.classification.includes('Whale') ? 'var(--purple-dim)' : m.classification.includes('Informed') ? 'var(--lime-dim)' : 'var(--blue-dim)', color: m.classification.includes('Whale') ? 'var(--purple)' : m.classification.includes('Informed') ? 'var(--lime)' : 'var(--blue)' }}>
                    {m.classification.split(' ').pop()}
                  </div>
                )}
                <span className="ev-arrow">&rarr;</span>
              </div>
            </div>
          ))}
        </div>

        {apiMarkets.length > visibleCount && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 0 60px' }}>
            <button
              className="land-cta"
              onClick={() => setVisibleCount(prev => prev + 20)}
              style={{ padding: '12px 32px', fontSize: 14 }}
            >
              See More Markets
            </button>
          </div>
        )}
      </div>

      {/* ANALYSIS */}
      <div className={`page ${page === 'analysis' ? 'on' : ''}`} id="analysisPage">
        <div className="analysis-wrap">
          {analyzing && !analysisResult && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text2)' }}>
              <div style={{ fontSize: 18, marginBottom: 20 }}>Running intelligence engines...</div>
              <div style={{ fontSize: 14, marginBottom: 10 }}>Analyzing integrity · Information layer · Confidence metrics</div>
            </div>
          )}
          {analysisError && !analysisResult && (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--red)' }}>
              <div style={{ fontSize: 18, marginBottom: 10 }}>Analysis failed</div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>{analysisError}</div>
              <button type="button" className="land-cta" onClick={() => go('markets')} style={{ margin: '0 auto' }}>Back to Markets</button>
            </div>
          )}
          {analysisResult && (
            <>
              <div className="verdict-hero bento-hero">
                <h1 className="analysis-page-title" id="analysisMarketTitle">{displayMarketName}</h1>
                <div className="verdict-meta-pill">
                  Live · Polymarket data · Logic engine
                </div>

                <div className="verdict-score-row bento-card">
                  <div className="trust-ring">
                    <svg viewBox="0 0 148 148">
                      <circle className="ring-bg" cx="74" cy="74" r="58" />
                      <circle
                        className={`ring-fill ${trustCls}`}
                        id="ringFill"
                        cx="74"
                        cy="74"
                        r="58"
                        strokeDasharray={RING_CIRCUMFERENCE}
                        strokeDashoffset={RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * trustScore) / 100}
                      />
                    </svg>
                    <div className="ring-center">
                      <div className={`ring-num ${trustCls}`} id="ringNum">{trustScore}</div>
                      <div className="ring-word">Trust Score</div>
                    </div>
                  </div>

                  <div className="radar-large">
                    <RadarChartSVG size={160} scores={{
                      wallet: analysisResult.master_res?.wallet_intelligence?.score || 0,
                      integrity: analysisResult.integrity_res?.score || 0,
                      info: analysisResult.info_res?.score || 0,
                      conf: analysisResult.conf_res?.confidence_score || 0
                    }} />
                  </div>
                </div>

                <div className="verdict-primary bento-card">
                  <div className="verdict-line" id="vLine">
                    {analysisResult.master_res?.verdict ?? 'Neutral'}
                  </div>
                  <div className="verdict-desc" id="vDesc">
                    {rec?.reasoning ?? analysisResult.integrity_res?.status ?? ''}
                  </div>
                </div>
                <div className="prob-row" style={{ position: 'relative', marginTop: 12 }}>
                  <div style={{ position: 'absolute', top: -14, left: 0, width: '100%', textAlign: 'center', fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Volume Sentiment (Trade Weighting)</div>
                  <div className="prob-block"><div className="prob-pct yes" id="vYes">{sentimentYesPct}%</div><div className="prob-out">YES</div></div>
                  <div className="prob-sep" /><div className="prob-vs">vs</div><div className="prob-sep" />
                  <div className="prob-block"><div className="prob-pct no" id="vNo">{sentimentNoPct}%</div><div className="prob-out">NO</div></div>
                </div>
              </div>

              <div className="analysis-body bento-layout analysis-grid-4">
                <div className="analysis-cell analysis-top-left">
                  <div className="bento-card bento-signals">
                    <div className="analysis-section-head">
                      <div className="analysis-section-title">Core signal breakdown</div>
                      <div className="analysis-section-sub">Market health and risk vectors.</div>
                    </div>
                    <div className="tiles-row full-analysis-tiles">
                      {(() => {
                        const ic = analysisResult.integrity_res?.components
                        const iCls = analysisResult.integrity_res?.score && analysisResult.integrity_res.score < 0.3 ? 'bad' : analysisResult.integrity_res?.score && analysisResult.integrity_res.score < 0.6 ? 'ok' : 'good'
                        const iAns = analysisResult.integrity_res?.status ?? ''
                        const iDesc = `Score ${((analysisResult.integrity_res?.score ?? 0) * 100).toFixed(0)}% · Analysis of risk vectors.`
                        const healthBlurb = (() => {
                          const s = (iAns || '').toLowerCase()
                          if (s.includes('healthy')) return 'Low risk of manipulation. Order flow looks normal and no single actor dominates—fair conditions for trading.'
                          if (s.includes('volatile')) return 'Moderate risk. Some concentration or unusual activity; treat signals with a bit more caution.'
                          if (s.includes('manipulation')) return 'High risk. Heavy whale influence or suspicious patterns—use extra caution before sizing in.'
                          return ''
                        })()
                        return (
                          <div className={`tile ${iCls}`} id="tile1">
                            <div className="tile-q">Is the market healthy?</div>
                            <div className={`tile-answer ${iCls}`} id="t1ans">{iAns}</div>
                            <div className="tile-desc" id="t1desc">{iDesc}</div>
                            <div className="tile-bars">
                              <div className="tbar-row"><span className="tbar-name">Whale</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((ic?.whale_risk ?? 0) * 100).toFixed(0)}%`, background: 'var(--lime)' }} /></div><span className="tbar-val">{(ic?.whale_risk ?? 0).toFixed(2)}</span></div>
                              <div className="tbar-row"><span className="tbar-name">Flip</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((ic?.flip_risk ?? 0) * 100).toFixed(0)}%`, background: 'var(--lime)' }} /></div><span className="tbar-val">{(ic?.flip_risk ?? 0).toFixed(2)}</span></div>
                              <div className="tbar-row"><span className="tbar-name">Cluster</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((ic?.cluster_risk ?? 0) * 100).toFixed(0)}%`, background: 'var(--lime)' }} /></div><span className="tbar-val">{(ic?.cluster_risk ?? 0).toFixed(2)}</span></div>
                            </div>
                            {healthBlurb && <div className="tile-blurb" id="t1blurb">{healthBlurb}</div>}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                <div className="analysis-cell analysis-top-right">
                  <div className="chart-card bento-card bento-chart">
                    <div className="chart-header">
                      <div><div className="chart-title">Price over time</div><div className="chart-sub">Implied YES probability · 5-min intervals · All-time</div></div>
                    </div>
                    <div className="chart-wrap">
                      <PriceChartSVG priceSeries={analysisResult.price_series ?? []} currentPct={yesPct} />
                    </div>
                  </div>
                </div>

                <div className="analysis-cell analysis-bottom-left">
                  {walletIntel && (
                    <div className="wallet-intel-card bento-card bento-wallet">
                      <div className="wi-header">
                        <div className="wi-header-left">
                          <div className="wi-label">Wallet Intel</div>
                          <div className={`wi-headline lean-${walletIntel.lean}`} id="wiHeadline">
                            {walletIntel.lean === 'yes' && 'Smart money leaning YES'}
                            {walletIntel.lean === 'no' && 'Smart money leaning NO'}
                            {walletIntel.lean === 'split' && 'Smart money is split'}
                          </div>
                          <div className="wi-sub" id="wiSub">
                            {walletIntel.lean === 'yes' && 'Top financial stakeholders are positioning for YES.'}
                            {walletIntel.lean === 'no' && 'Top financial stakeholders are positioning for NO.'}
                            {walletIntel.lean === 'split' && 'No consensus among the largest market participants.'}
                          </div>
                        </div>
                        <div className={`wi-lean-badge ${walletIntel.lean}`} id="wiLeanBadge">
                          <div className="wi-lean-pct" id="wiLeanPct">{walletIntel.leanPct}%</div>
                          <div className={`wi-lean-dir ${walletIntel.lean}`} id="wiLeanDir">{walletIntel.lean === 'split' ? '~SPLIT' : walletIntel.lean.toUpperCase()}</div>
                        </div>
                      </div>
                      <div className="wi-distribution">
                        <div className="wi-distribution-label">Where top wallets stand (YES belief)</div>
                        {(() => {
                          const bins = 10
                          const binCounts = Array.from({ length: bins }, () => 0)
                          walletIntel.wallets.forEach((w) => {
                            const bin = Math.min(bins - 1, Math.floor((w.belief ?? 0) / (100 / bins)))
                            binCounts[bin] += 1
                          })
                          const maxCount = Math.max(1, ...binCounts)
                          const peakBin = binCounts.indexOf(maxCount)
                          const peakStart = peakBin * 10
                          const peakEnd = peakStart + 10
                          const summary = maxCount === 0 ? 'No data' : `Most at ${peakStart}–${peakEnd}% YES`
                          return (
                            <>
                              <div className="wi-distribution-dots-row">
                                <div className="wi-distribution-dots-track">
                                  {(() => {
                                    const NUDGE = 2.5
                                    const OVERLAP_THRESH = 3
                                    let nudgeIndex = 0
                                    let lastBelief: number | null = null
                                    return walletIntel.wallets.map((wlt, i) => {
                                      const belief = Number(wlt.belief) || 0
                                      const overlaps = lastBelief !== null && Math.abs(belief - lastBelief) < OVERLAP_THRESH
                                      if (overlaps) nudgeIndex += 1
                                      else nudgeIndex = 0
                                      lastBelief = belief
                                      const leftPct = Math.min(98, Math.max(2, belief + (nudgeIndex * NUDGE)))
                                      return (
                                        <div
                                          key={wlt.addr}
                                          className={`wi-wallet-dot ${wlt.side}`}
                                          style={{ left: `${leftPct}%` }}
                                          title={`#${i + 1} ${wlt.addr} · ${wlt.belief}% YES`}
                                          aria-hidden="false"
                                        />
                                      )
                                    })
                                  })()}
                                </div>
                              </div>
                              <div className="wi-distribution-bars-wrap">
                                <div className="wi-distribution-bars">
                                  {binCounts.map((count, i) => (
                                    <div
                                      key={i}
                                      className="wi-distribution-bar"
                                      style={{
                                        width: `${100 / bins}%`,
                                        height: `${maxCount === 0 ? 0 : (count / maxCount) * 100}%`,
                                      }}
                                      title={`${i * 10}-${(i + 1) * 10}% YES: ${count} wallet${count !== 1 ? 's' : ''}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="wi-distribution-axis">
                                <div className="wi-distribution-track" />
                                <div className="wi-distribution-labels">
                                  {[0, 25, 50, 75, 100].map((p) => (
                                    <span key={p} className="wi-distribution-tick" style={{ left: `${p}%` }}>{p}%</span>
                                  ))}
                                </div>
                              </div>
                              <div className="wi-distribution-summary">{summary}</div>
                            </>
                          )
                        })()}
                      </div>
                      <div className="wi-divergence">
                        <div className="wi-div-label">Divergence among top wallets</div>
                        <div className="wi-div-viz">
                          <div className="wi-div-track" id="divTrack">
                            <div style={{ height: '100%', width: `${walletIntel.divergence === 'Low' ? 25 : walletIntel.divergence === 'Medium' ? 55 : 85}%`, background: walletIntel.divergence === 'Low' ? 'var(--lime)' : walletIntel.divergence === 'Medium' ? 'var(--amber)' : 'var(--red)', borderRadius: 100, transition: 'width .6s ease' }} />
                          </div>
                          <div className={`wi-div-stat ${walletIntel.divergence.toLowerCase()}`} id="divStat">{walletIntel.divergence}</div>
                        </div>
                        <div className="wi-div-desc" id="divDesc">
                          {walletIntel.divergence === 'Low' && 'Smart money agrees. That gives the signal more weight.'}
                          {walletIntel.divergence === 'Medium' && 'Some disagreement among top wallets. Signal has noise.'}
                          {walletIntel.divergence === 'High' && 'Wide split among smart wallets. The signal is contested.'}
                        </div>
                      </div>
                      <div className="wi-wallets">
                        <div className="wi-wallets-label">
                          Top wallets <span style={{ color: 'var(--text3)', fontWeight: 500 }}>(by accuracy)</span>
                          <span className="wi-expand-btn" id="wiExpandBtn" onClick={() => setWalletsExpanded((x) => !x)} role="button" tabIndex={0}>{walletsExpanded ? 'Show less' : 'Show all'}</span>
                        </div>
                        <div id="walletList">
                          {(walletsExpanded ? walletIntel.wallets : walletIntel.wallets.slice(0, 3)).map((wlt, i) => (
                            <div key={wlt.addr} className="wallet-row">
                              <div className={`wallet-avatar s${(i % 5) + 1}`}>{wlt.label.includes('#') ? (wlt.label.replace(/\D/g, '') || '?') : '#'}</div>
                              <div className="wallet-info">
                                <div className="wallet-addr">{wlt.label} · <span style={{ fontSize: 10, color: 'var(--text3)' }}>{wlt.addr}</span></div>
                                <div className="wallet-stats">{wlt.rank} · {wlt.vol} vol {wlt.badge && <span className={`wallet-badge badge-${wlt.badge}`}>{wlt.badgeLbl}</span>}</div>
                              </div>
                              <div className="wallet-belief">
                                <div className={`wallet-belief-pct ${wlt.side === 'yes' ? 'yes' : wlt.side === 'no' ? 'no' : ''}`} style={wlt.side === 'neutral' ? { color: 'var(--amber)' } : undefined}>{wlt.belief}%</div>
                                <div className="wallet-belief-lbl">YES belief</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="analysis-cell analysis-bottom-right">
                  <div className="chat-card bento-card bento-chat">
                    <div className="chat-header">
                      <div className="chat-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src="/reddog-removebg-preview.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 4 }} />
                        Ask Big-Dawg
                      </div>
                      <div className="ai-tag">AI</div>
                    </div>
                    <div className="chat-tip" id="chatTip">
                      <b>AI Recommendation:</b>{' '}
                      {aiRecommendationText}
                    </div>
                    <div className="chat-log" id="chatLog">
                      {chatMessages.map((m, i) => (
                        <div key={i} className={`cmsg ${m.role === 'user' ? 'u' : 'b'}`}>
                          <span className="crole">{m.role === 'user' ? 'You' : 'Big-Dawg'}</span>
                          <div className="cbubble">{m.text}</div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="cmsg b typing-msg" aria-live="polite" aria-label="Big-Dawg is thinking">
                          <span className="crole">Big-Dawg</span>
                          <div className="cbubble typing-bubble">
                            <span className="typing-dots"><span /><span /><span /></span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="chat-in-row">
                      <input
                        className="chat-in"
                        id="chatIn"
                        type="text"
                        placeholder="Ask anything about this bet..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
                      />
                      <button type="button" className="send-btn" onClick={sendMsg} aria-label="Send">Send</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div >

      {/* INFO CARD MODAL */}
      {showInfoCard && selectedMarket && (
        <div className="modal-overlay" onClick={() => setShowInfoCard(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg)', borderRadius: 12, padding: 24, maxWidth: 600, width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ margin: 0, color: 'var(--text)' }}>{selectedMarket.question}</h2>
              <button onClick={() => setShowInfoCard(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text2)' }}>×</button>
            </div>
            {analyzing ? (
              <div style={{ textAlign: 'center', padding: 40 }}>Running analysis...</div>
            ) : analysisResult ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                  <div className="trust-ring" style={{ width: 80, height: 80 }}>
                    <svg viewBox="0 0 148 148" style={{ width: '100%', height: '100%' }}>
                      <circle className="ring-bg" cx="74" cy="74" r="58" />
                      <circle
                        className={`ring-fill ${trustCls}`}
                        cx="74"
                        cy="74"
                        r="58"
                        strokeDasharray={RING_CIRCUMFERENCE}
                        strokeDashoffset={RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * trustScore) / 100}
                      />
                    </svg>
                    <div className="ring-center" style={{ width: 60, height: 60, top: 10, left: 10 }}>
                      <div className={`ring-num ${trustCls}`} style={{ fontSize: 16 }}>{trustScore}</div>
                      <div className="ring-word" style={{ fontSize: 8 }}>Trust</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{analysisResult.master_res?.verdict ?? 'Neutral'}</div>
                    <div style={{ color: 'var(--text2)', fontSize: 14 }}>{rec?.reasoning ?? analysisResult.integrity_res?.status ?? ''}</div>
                  </div>
                </div>
                <div className="tiles-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {/* Integrity Tile */}
                  {(() => {
                    const iCls = analysisResult.integrity_res?.score && analysisResult.integrity_res.score < 0.3 ? 'bad' : analysisResult.integrity_res?.score && analysisResult.integrity_res.score < 0.6 ? 'ok' : 'good'
                    const iAns = analysisResult.integrity_res?.status ?? ''
                    const iDesc = `Score ${(analysisResult.integrity_res?.score ?? 0) * 100}%`
                    return (
                      <div className={`tile ${iCls}`} style={{ flex: 1, minWidth: 200 }}>
                        <div className="tile-q">Market Health</div>
                        <div className={`tile-answer ${iCls}`}>{iAns}</div>
                        <div className="tile-desc">{iDesc}</div>
                      </div>
                    )
                  })()}
                  {/* Information Tile */}
                  {(() => {
                    const inf = analysisResult.info_res?.components
                    const infCls = inf && (inf.informed_score ?? 0) > 0.5 ? 'good' : (inf?.whale_score ?? 0) > 0.4 ? 'ok' : 'bad'
                    const sAns = analysisResult.info_res?.classification ?? ''
                    const sDesc = `Informed ${(inf?.informed_score ?? 0) * 100}%, Whale ${(inf?.whale_score ?? 0) * 100}%`
                    return (
                      <div className={`tile ${infCls}`} style={{ flex: 1, minWidth: 200 }}>
                        <div className="tile-q">Who's Trading?</div>
                        <div className={`tile-answer ${infCls}`}>{sAns}</div>
                        <div className="tile-desc">{sDesc}</div>
                      </div>
                    )
                  })()}
                  {/* Confidence Tile */}
                  {(() => {
                    const cq = analysisResult.conf_res?.data_quality ?? 0
                    const confCls = trustClass(cq * 100)
                    const cAns = analysisResult.conf_res?.confidence_level ?? ''
                    const cDesc = `Quality ${(cq * 100).toFixed(0)}%`
                    return (
                      <div className={`tile ${confCls}`} style={{ flex: 1, minWidth: 200 }}>
                        <div className="tile-q">Signal Strength</div>
                        <div className={`tile-answer ${confCls}`}>{cAns}</div>
                        <div className="tile-desc">{cDesc}</div>
                      </div>
                    )
                  })()}
                </div>
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <button onClick={() => { setShowInfoCard(false); go('analysis'); }} style={{ padding: '8px 16px', background: 'var(--lime)', color: 'var(--bg)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>View Full Analysis</button>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40 }}>No analysis available.</div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default App
