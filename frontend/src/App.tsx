import { useState, useRef, useEffect } from 'react'
import {
  allMarkets,
  getAnalysisForBet,
  getWalletIntelForBet,
  type EventItem,
  type BetItem,
} from './data'
import { fetchMarkets, analyzeMarket, chat as apiChat } from './api'
import type { Market, AnalysisResult } from './types'

type Page = 'landing' | 'markets' | 'analysis'

const API_BASE = import.meta.env.VITE_API_URL || ''
const RING_CIRCUMFERENCE = 364.4

const botReplies = [
  (betId: number) => {
    const w = getWalletIntelForBet(betId)
    return w.lean === 'split'
      ? 'Based on the wallet intel, smart wallets are split — no clear edge from the pros.'
      : `Based on the wallet intel, smart money is leaning ${w.lean.toUpperCase()} at ${w.leanPct}%. That's meaningful signal.`
  },
  () =>
    "The divergence score tells us how much top wallets disagree. Low divergence means even the sharpest traders agree — that's a strong signal.",
  () =>
    'Integrity checks for whale domination, coordinated trade timing, and wallets flipping sides frequently. Clean markets score above 0.7.',
  () =>
    "A trust score above 70 means the market is healthy and the probability is likely reliable. Below 50? I'd treat that number with serious skepticism.",
  () =>
    "Smart wallets are ranked by their historical accuracy — basically Brier scores. If the top 5 all agree, that's about as good as it gets.",
]

function trustClass(score: number): 'trust' | 'caution' | 'risk' {
  if (score >= 70) return 'trust'
  if (score >= 50) return 'caution'
  return 'risk'
}

function PriceChartSVG({ priceSeries, currentPct }: { priceSeries: { timestamp: string; price: number }[]; currentPct: number }) {
  const w = 600
  const h = 160
  const padding = { left: 38, right: 22, top: 20, bottom: 20 }
  const plotH = h - padding.top - padding.bottom
  const plotW = w - padding.left - padding.right

  let minP = 0
  let maxP = 100

  if (priceSeries.length >= 2) {
    const rawMin = Math.min(...priceSeries.map((d) => d.price))
    const rawMax = Math.max(...priceSeries.map((d) => d.price))
    const buffer = (rawMax - rawMin) * 0.1 || 0.05
    minP = Math.max(0, rawMin - buffer)
    maxP = Math.min(1, rawMax + buffer)
  }

  const range = maxP - minP || 1
  const pts = priceSeries.length >= 2
    ? priceSeries.map((d, i) => ({
      x: padding.left + (i / (priceSeries.length - 1)) * plotW,
      y: padding.top + (1 - (d.price - minP) / range) * plotH
    }))
    : []

  const linePath = pts.length >= 2 ? pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : ''
  const areaPath = pts.length >= 2 ? linePath + ` L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z` : ''
  const lastX = pts.length >= 2 ? pts[pts.length - 1].x : padding.left
  const lastY = pts.length >= 2 ? pts[pts.length - 1].y : h / 2

  // Dynamic Ticks
  const ticks = [maxP, maxP - (range * 0.33), maxP - (range * 0.66), minP]

  return (
    <svg className="price-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#b9f751" stopOpacity={0.14} />
          <stop offset="100%" stopColor="#b9f751" stopOpacity={0} />
        </linearGradient>
      </defs>
      <g className="c-grid">
        {ticks.map((_, i) => (
          <line key={i} x1="0" y1={padding.top + (i / 3) * plotH} x2="600" y2={padding.top + (i / 3) * plotH} />
        ))}
      </g>
      <g className="c-axis">
        {ticks.map((t, i) => (
          <text key={i} x="2" y={padding.top + (i / 3) * plotH + 3}>{Math.round(t * 100)}%</text>
        ))}
      </g>
      <g className="c-axis">
        <text x="38" y="158">Start</text>
        <text x="295" y="158">Mid</text>
        <text x="552" y="158">Now</text>
      </g>
      {pts.length >= 2 && (
        <>
          <path className="c-area" d={areaPath} />
          <path className="c-line" d={linePath} />
          <circle cx={lastX} cy={lastY} r="4" fill="#b9f751" />
          <circle cx={lastX} cy={lastY} r="9" fill="#b9f751" opacity={0.14} />
          <rect x={lastX + 4} y={lastY - 10} width="32" height="15" rx="4" fill="rgba(185,247,81,.14)" stroke="rgba(185,247,81,.3)" strokeWidth={0.5} />
          <text x={lastX + 20} y={lastY - 0.5} textAnchor="middle" fontSize="8" fill="#b9f751" fontFamily="Figtree" fontWeight="700">{currentPct}%</text>
        </>
      )}
    </svg>
  )
}

function App() {
  const [page, setPage] = useState<Page>('landing')
  const [overlayOn, setOverlayOn] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [selectedBet, setSelectedBet] = useState<BetItem | null>(null)
  const [apiMarkets, setApiMarkets] = useState<Market[]>([])
  const [marketsLoading, setMarketsLoading] = useState(false)
  const [marketsError, setMarketsError] = useState<string | null>(null)
  const [stats, setStats] = useState<{ volume_tracked: string; live_markets: number; avg_analysis_time: string } | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [walletsExpanded, setWalletsExpanded] = useState(false)
  const [tradesOpen, setTradesOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const replyIdx = useRef(0)

  // Fetch global stats on mount
  useEffect(() => {
    if (!API_BASE) return
    fetch(`${API_BASE}/api/stats`)
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
  }, [API_BASE])

  useEffect(() => {
    if (!API_BASE || page !== 'markets') return
    setMarketsLoading(true)
    setMarketsError(null)
    fetchMarkets()
      .then((list) => {
        setApiMarkets(list)
        setMarketsError(null)
      })
      .catch((e) => {
        setApiMarkets([])
        setMarketsError(e instanceof Error ? e.message : 'Failed to load markets')
      })
      .finally(() => setMarketsLoading(false))
  }, [API_BASE, page])

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

  const handleAnalyzeMarket = async (m: Market) => {
    setAnalysisError(null)
    setAnalyzing(true)
    try {
      const result = await analyzeMarket(m.slug || m.conditionId)
      setAnalysisResult(result)
      setChatMessages([])
      replyIdx.current = 0
      go('analysis')
    } catch (e) {
      setAnalysisError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const useRealData = analysisResult != null
  const mockAnalysis = selectedBet ? getAnalysisForBet(selectedBet.id) : null
  const mockWalletIntel = selectedBet ? getWalletIntelForBet(selectedBet.id) : null
  const analysis = useRealData ? null : mockAnalysis
  const walletIntel = useRealData ? (analysisResult?.wallet_intel ?? null) : mockWalletIntel

  const sendMsg = async () => {
    const val = chatInput.trim()
    if (!val) return
    setChatMessages((prev) => [...prev, { role: 'user', text: val }])
    setChatInput('')
    if (useRealData && analysisResult) {
      try {
        const history = chatMessages.map((m) => ({ role: m.role === 'user' ? 'human' : 'assistant', content: m.text }))
        const response = await apiChat(
          analysisResult.integrity_res,
          analysisResult.info_res,
          analysisResult.conf_res,
          val,
          history
        )
        setChatMessages((prev) => [...prev, { role: 'bot', text: response || '' }])
      } catch {
        setChatMessages((prev) => [...prev, { role: 'bot', text: 'Chat is unavailable. Set up the backend and GEMINI_API_KEY.' }])
      }
      return
    }
    const idx = replyIdx.current % botReplies.length
    replyIdx.current += 1
    const reply = botReplies[idx](selectedBet?.id ?? 1)
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: 'bot', text: reply }])
    }, 550)
  }

  const displayMarketName = useRealData ? (analysisResult?.market_name ?? '') : (selectedBet?.title ?? '')
  const trustScore = useRealData
    ? Math.round((analysisResult?.master_res?.overall_score ?? analysisResult?.integrity_res?.score ?? 0) * 100)
    : (mockAnalysis?.trust ?? 0)
  const trustCls = useRealData ? trustClass(trustScore) : (mockAnalysis?.trustCls ?? 'caution')
  const yesPct = useRealData
    ? Math.round((analysisResult?.conf_res?.probability ?? 0) * 100)
    : (selectedBet?.yes ?? 0)
  const noPct = 100 - yesPct
  const rec = analysisResult?.recommendation
  const tipHtml = useRealData && rec
    ? `<b>AI Recommendation:</b> ${rec.action}. ${rec.reasoning}`
    : (mockAnalysis?.tip ?? '')

  return (
    <>
      <div className={`overlay ${overlayOn ? 'on' : ''}`} id="overlay" aria-hidden />

      {page !== 'landing' && (
        <nav className="nav" id="mainNav">
          <div className="nav-logo" onClick={() => go('markets')} role="button">
            <div className="logo-paw"><img src="/reddog.png" alt="Big-Dawg" /></div>
            <span>Big<span className="logo-sup">-Dawg</span></span>
          </div>
          <div className="nav-crumb" id="navCrumb">
            <span className="crumb-item" onClick={() => go('markets')}>Markets</span>
            {(analysisResult || selectedBet) && (
              <>
                <span className="crumb-sep">/</span>
                <span className="crumb-item active">{(displayMarketName || selectedBet?.title || '').slice(0, 28)}…</span>
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
        <span className="land-paw"><img src="/reddog.png" alt="" /></span>
        <div className="land-title">Can you <em>trust</em><br />that bet?</div>
        <div className="land-sub">Big-Dawg reads the signal behind every prediction market — so you know when to bet, and when to walk.</div>
        <button type="button" className="land-cta" onClick={enterApp}>Browse Markets →</button>
        <div className="land-stats">
          <div className="lstat"><div className="lstat-val">{stats?.volume_tracked ?? '$2.4B'}</div><div className="lstat-lab">Volume Tracked</div></div>
          <div style={{ width: 1, background: 'var(--border2)' }} />
          <div className="lstat"><div className="lstat-val">{stats?.live_markets ?? '1,247'}</div><div className="lstat-lab">Live Markets</div></div>
          <div style={{ width: 1, background: 'var(--border2)' }} />
          <div className="lstat"><div className="lstat-val">{stats?.avg_analysis_time ?? '98ms'}</div><div className="lstat-lab">Avg Analysis</div></div>
        </div>
      </div>

      {/* MARKETS — real from API (Polymarket + logic engine) or mock */}
      <div className={`page ${page === 'markets' ? 'on' : ''}`} id="marketsPage">
        <div className="events-hero">
          <div className="events-title">All <em>markets</em></div>
          <div className="events-sub">
            {API_BASE
              ? (apiMarkets.length > 0 ? `Live Polymarket data · ${apiMarkets.length} markets · Click to run logic-engine analysis.` : marketsError ? 'Could not load markets. Is the backend running?' : 'Loading markets from Polymarket…')
              : 'Using demo data. Set VITE_API_URL=http://localhost:8000 and run the backend for real markets and logic-engine analysis.'}
          </div>
        </div>
        {marketsError && API_BASE && (
          <div style={{ padding: '12px 28px', marginBottom: 8, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13 }}>{marketsError}</div>
        )}
        {analysisError && (
          <div style={{ padding: '12px 28px', marginBottom: 8, background: 'var(--red-dim)', border: '1px solid var(--red)', borderRadius: 12, color: 'var(--red)', fontSize: 13 }}>{analysisError}</div>
        )}
        {marketsLoading && apiMarkets.length === 0 && (
          <div style={{ padding: '12px 28px', color: 'var(--text2)', fontSize: 14 }}>Loading markets from Polymarket…</div>
        )}
        {analyzing && (
          <div style={{ padding: '12px 28px', color: 'var(--text2)', fontSize: 14 }}>Running logic engine (integrity, information, confidence)…</div>
        )}
        <div className="bets-grid" style={{ padding: '0 28px 60px' }} id="marketsGrid">
          {apiMarkets.length > 0
            ? apiMarkets.map((m) => (
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
                  {m.trust_score != null && (
                    <div className="trust-mini">
                      <div className={`tmini-num ${trustClass(m.trust_score)}`}>{m.trust_score}</div>
                      <div className={`tmini-lbl ${trustClass(m.trust_score)}`}>{trustClass(m.trust_score) === 'trust' ? 'Trusted' : trustClass(m.trust_score) === 'caution' ? 'Caution' : 'Risky'}</div>
                    </div>
                  )}
                </div>
                <div className="bet-foot">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>Vol ${typeof m.volume === 'number' ? m.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : m.volume}</span>
                  </div>
                  {m.classification && (
                    <div className="smart-lean-chip" style={{ background: m.classification.includes('Whale') ? 'var(--purple-dim)' : m.classification.includes('Informed') ? 'var(--lime-dim)' : 'var(--blue-dim)', color: m.classification.includes('Whale') ? 'var(--purple)' : m.classification.includes('Informed') ? 'var(--lime)' : 'var(--blue)' }}>
                      🧠 {m.classification.split(' ').pop()}
                    </div>
                  )}
                  <span className="ev-arrow">→</span>
                </div>
              </div>
            ))
            : !API_BASE
              ? allMarkets.map(({ bet: b, event: e }) => (
                <div
                  key={b.id}
                  className="bet-card"
                  onClick={() => {
                    setSelectedEvent(e)
                    setSelectedBet(b)
                    setAnalysisResult(null)
                    setChatMessages([])
                    replyIdx.current = 0
                    go('analysis')
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') {
                      setSelectedEvent(e)
                      setSelectedBet(b)
                      setAnalysisResult(null)
                      setChatMessages([])
                      replyIdx.current = 0
                      go('analysis')
                    }
                  }}
                >
                  <div className="bet-card-top">
                    <div className="bet-card-title">
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', display: 'block', marginBottom: 4 }}>{e.emoji} {e.title}</span>
                      {b.title}
                    </div>
                    <div className="trust-mini">
                      <div className={`tmini-num ${b.trustCls}`}>{b.trust}</div>
                      <div className={`tmini-lbl ${b.trustCls}`}>{b.trustCls === 'trust' ? 'Trusted' : b.trustCls === 'caution' ? 'Caution' : 'Risky'}</div>
                    </div>
                  </div>
                  <div className="prob-bar-wrap">
                    <div className="prob-bar-labels"><span className="yes-lbl">YES {b.yes}%</span><span className="no-lbl">NO {100 - b.yes}%</span></div>
                    <div className="prob-bar-track"><div className="prob-bar-fill" style={{ width: `${b.yes}%` }} /></div>
                  </div>
                  <div className="bet-foot">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.live && <div className="live-tag"><div className="live-tag-dot" />LIVE</div>}
                      <span>{b.vol} vol</span>
                    </div>
                    {b.smartLeanDir !== 'split' ? (
                      <div className="smart-lean-chip">🧠 {b.smartLean}</div>
                    ) : (
                      <div className="smart-lean-chip" style={{ background: 'var(--amber-dim)', borderColor: 'rgba(255,184,77,.2)', color: 'var(--amber)' }}>🧠 Split</div>
                    )}
                  </div>
                </div>
              ))
              : null}
        </div>
      </div>

      {/* ANALYSIS */}
      <div className={`page ${page === 'analysis' ? 'on' : ''}`} id="analysisPage">
        <div className="analysis-wrap">
          {(analysisResult || (selectedBet && analysis)) && (
            <>
              <div className="verdict-hero">
                {useRealData && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '4px 10px', background: 'var(--lime-dim)', border: '1px solid rgba(185,247,81,.25)', borderRadius: 8, fontSize: 11, fontWeight: 700, color: 'var(--lime)' }}>
                    Live · Polymarket data · Logic engine
                  </div>
                )}
                <div className="verdict-mkt-row">
                  <div className="verdict-mkt-emoji">{selectedEvent?.emoji ?? '🗳'}</div>
                  <div className="verdict-mkt-name" id="vName">{displayMarketName}</div>
                </div>
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
                <div className="verdict-line" id="vLine">
                  {useRealData ? (analysisResult?.master_res?.verdict ?? 'Neutral') : analysis!.line}
                </div>
                <div className="verdict-desc" id="vDesc">
                  {useRealData ? (rec?.reasoning ?? analysisResult?.integrity_res?.status ?? '') : analysis!.desc}
                </div>
                <div className="prob-row">
                  <div className="prob-block"><div className="prob-pct yes" id="vYes">{yesPct}%</div><div className="prob-out">YES</div></div>
                  <div className="prob-sep" /><div className="prob-vs">vs</div><div className="prob-sep" />
                  <div className="prob-block"><div className="prob-pct no" id="vNo">{noPct}%</div><div className="prob-out">NO</div></div>
                </div>
                <div className="verdict-btns">
                  <button type="button" className="vbet yes" id="vBetYes">Buy YES · {yesPct}¢</button>
                  <button type="button" className="vbet no" id="vBetNo">Buy NO · {noPct}¢</button>
                </div>
              </div>

              <div className="analysis-body">
                <div className="analysis-left">
                  <div className="tiles-row">
                    {(() => {
                      const ic = useRealData ? analysisResult?.integrity_res?.components : null
                      const intCls = useRealData ? trustClass((1 - (ic?.whale_risk ?? 0)) * 100) : analysis!.int_cls
                      const iAns = useRealData ? (analysisResult?.integrity_res?.status ?? '') : analysis!.int_ans
                      const iDesc = useRealData ? `Whale ${((ic?.whale_risk ?? 0) * 100).toFixed(0)}%, Flip ${((ic?.flip_risk ?? 0) * 100).toFixed(0)}%, Cluster ${((ic?.cluster_risk ?? 0) * 100).toFixed(0)}%` : analysis!.int_desc
                      return (
                        <div className={`tile ${intCls}`} id="tile1">
                          <div className="tile-icon">🛡</div>
                          <div className="tile-q">Is it manipulated?</div>
                          <div className={`tile-answer ${intCls}`} id="t1ans">{iAns}</div>
                          <div className="tile-desc" id="t1desc">{iDesc}</div>
                          <div className="tile-bars">
                            <div className="tbar-row"><span className="tbar-name">Whale</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((ic?.whale_risk ?? 0.22) * 100).toFixed(0)}%`, background: 'var(--lime)' }} /></div><span className="tbar-val">{(ic?.whale_risk ?? 0.22).toFixed(2)}</span></div>
                            <div className="tbar-row"><span className="tbar-name">Flip</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((ic?.flip_risk ?? 0.12) * 100).toFixed(0)}%`, background: 'var(--lime)' }} /></div><span className="tbar-val">{(ic?.flip_risk ?? 0.12).toFixed(2)}</span></div>
                            <div className="tbar-row"><span className="tbar-name">Cluster</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((ic?.cluster_risk ?? 0.09) * 100).toFixed(0)}%`, background: 'var(--lime)' }} /></div><span className="tbar-val">{(ic?.cluster_risk ?? 0.09).toFixed(2)}</span></div>
                          </div>
                        </div>
                      )
                    })()}
                    {(() => {
                      const inf = useRealData ? analysisResult?.info_res?.components : null
                      const infCls = useRealData ? (inf && (inf.informed_score ?? 0) > 0.5 ? 'good' : (inf?.whale_score ?? 0) > 0.4 ? 'ok' : 'bad') : analysis!.sent_cls
                      const sAns = useRealData ? (analysisResult?.info_res?.classification ?? '') : analysis!.sent_ans
                      const sDesc = useRealData ? `Informed ${((inf?.informed_score ?? 0) * 100).toFixed(0)}%, Retail ${((inf?.retail_score ?? 0) * 100).toFixed(0)}%, Whale ${((inf?.whale_score ?? 0) * 100).toFixed(0)}%` : analysis!.sent_desc
                      return (
                        <div className={`tile ${infCls}`} id="tile2">
                          <div className="tile-icon">🧠</div>
                          <div className="tile-q">Who's trading it?</div>
                          <div className={`tile-answer ${infCls}`} id="t2ans">{sAns}</div>
                          <div className="tile-desc" id="t2desc">{sDesc}</div>
                          <div className="tile-bars">
                            <div className="tbar-row"><span className="tbar-name">Informed</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((inf?.informed_score ?? 0.74) * 100).toFixed(0)}%`, background: 'var(--lime)' }} /></div><span className="tbar-val">{((inf?.informed_score ?? 0.74) * 100).toFixed(0)}%</span></div>
                            <div className="tbar-row"><span className="tbar-name">Whale</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((inf?.whale_score ?? 0.16) * 100).toFixed(0)}%`, background: 'var(--purple)' }} /></div><span className="tbar-val">{((inf?.whale_score ?? 0.16) * 100).toFixed(0)}%</span></div>
                            <div className="tbar-row"><span className="tbar-name">Retail</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${((inf?.retail_score ?? 0.1) * 100).toFixed(0)}%`, background: 'var(--blue)' }} /></div><span className="tbar-val">{((inf?.retail_score ?? 0.1) * 100).toFixed(0)}%</span></div>
                          </div>
                        </div>
                      )
                    })()}
                    {(() => {
                      const cq = useRealData ? (analysisResult?.conf_res?.data_quality ?? 0) : 0.84
                      const cv = useRealData ? (analysisResult?.conf_res?.conviction_score ?? 0) : 0.71
                      const confCls = useRealData ? trustClass(cq * 100) : analysis!.conf_cls
                      const cAns = useRealData ? (analysisResult?.conf_res?.confidence_level ?? '') : analysis!.conf_ans
                      const cDesc = useRealData ? `Data quality ${(cq * 100).toFixed(0)}%, Conviction ${(cv * 100).toFixed(0)}%` : analysis!.conf_desc
                      return (
                        <div className={`tile ${confCls}`} id="tile3">
                          <div className="tile-icon">🎯</div>
                          <div className="tile-q">How sure is the signal?</div>
                          <div className={`tile-answer ${confCls}`} id="t3ans">{cAns}</div>
                          <div className="tile-desc" id="t3desc">{cDesc}</div>
                          <div className="tile-bars">
                            <div className="tbar-row"><span className="tbar-name">Quality</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${(cq * 100).toFixed(0)}%`, background: 'var(--lime)' }} /></div><span className="tbar-val">{(cq * 100).toFixed(0)}%</span></div>
                            <div className="tbar-row"><span className="tbar-name">Conviction</span><div className="tbar-track"><div className="tbar-fill" style={{ width: `${(cv * 100).toFixed(0)}%`, background: 'var(--purple)' }} /></div><span className="tbar-val">{(cv * 100).toFixed(0)}%</span></div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>

                  {walletIntel && (
                    <div className="wallet-intel-card">
                      <div className="wi-header">
                        <div className="wi-header-left">
                          <div className="wi-label">🧠 Wallet Intel</div>
                          <div className={`wi-headline lean-${walletIntel.lean}`} id="wiHeadline">
                            {walletIntel.lean === 'yes' && 'Smart money leaning YES'}
                            {walletIntel.lean === 'no' && 'Smart money leaning NO'}
                            {walletIntel.lean === 'split' && 'Smart money is split'}
                          </div>
                          <div className="wi-sub" id="wiSub">
                            {walletIntel.lean === 'yes' && `${walletIntel.wallets.filter((x) => x.side === 'yes').length} of ${walletIntel.wallets.length} top wallets are on YES. They usually know.`}
                            {walletIntel.lean === 'no' && `${walletIntel.wallets.filter((x) => x.side === 'no').length} of ${walletIntel.wallets.length} top wallets are on NO. Worth noting.`}
                            {walletIntel.lean === 'split' && 'Top wallets are divided. No clear edge from the smart crowd.'}
                          </div>
                        </div>
                        <div className={`wi-lean-badge ${walletIntel.lean}`} id="wiLeanBadge">
                          <div className="wi-lean-pct" id="wiLeanPct">{walletIntel.leanPct}%</div>
                          <div className="wi-lean-dir" id="wiLeanDir">{walletIntel.lean === 'split' ? '~SPLIT' : walletIntel.lean.toUpperCase()}</div>
                        </div>
                      </div>
                      <div className="wi-dot-chart">
                        <div className="wi-dot-chart-label">Where smart wallets stand</div>
                        <div className="dot-chart-wrap">
                          <div className="dot-chart-axis" id="dotAxis">
                            <div className="dot-chart-track" />
                            <div className="dot-chart-ticks">
                              {[10, 30, 50, 70, 90].map((p) => (
                                <div key={p}><div className="tick-line" style={{ left: `${p}%` }} /><div className="tick-lbl" style={{ left: `${p}%` }}>{p}%</div></div>
                              ))}
                            </div>
                            {walletIntel.wallets.map((wlt, i) => (
                              <div key={wlt.addr} className={`wallet-dot ${wlt.side}`} style={{ left: `${wlt.belief}%` }} title={`${wlt.addr} · ${wlt.belief}% YES`}>{i + 1}</div>
                            ))}
                          </div>
                        </div>
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
                          <span className="wi-expand-btn" id="wiExpandBtn" onClick={() => setWalletsExpanded((x) => !x)} role="button" tabIndex={0}>{walletsExpanded ? 'Show less ↑' : 'Show all ↓'}</span>
                        </div>
                        <div id="walletList">
                          {(walletsExpanded ? walletIntel.wallets : walletIntel.wallets.slice(0, 3)).map((wlt, i) => (
                            <div key={wlt.addr} className="wallet-row">
                              <div className={`wallet-avatar s${(i % 5) + 1}`}>{wlt.label.includes('#') ? (wlt.label.replace(/\D/g, '') || '?') : '🏆'}</div>
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

                  <div className="chart-card">
                    <div className="chart-header">
                      <div><div className="chart-title">Price over time</div><div className="chart-sub">Implied YES probability · 5-min intervals</div></div>
                      <div className="time-btns">
                        <div className="tbtn on">1D</div><div className="tbtn">7D</div><div className="tbtn">30D</div><div className="tbtn">ALL</div>
                      </div>
                    </div>
                    <div className="chart-wrap">
                      <PriceChartSVG priceSeries={useRealData ? (analysisResult?.price_series ?? []) : []} currentPct={yesPct} />
                    </div>
                  </div>

                  <div className={`trades-card ${tradesOpen ? 'open' : ''}`} id="tradesCard">
                    <div className="trades-tog" onClick={() => setTradesOpen((x) => !x)} role="button" tabIndex={0}>
                      <span>Raw trades <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>· {useRealData ? (analysisResult?.trades_count ?? 0) : 247} trades</span></span>
                      <span className="trades-arrow">▼</span>
                    </div>
                    <div className="trades-body">
                      <table className="trades-tbl">
                        <thead><tr><th>Wallet</th><th>Time</th><th>Size</th><th>Price</th><th>Side</th></tr></thead>
                        <tbody>
                          {(useRealData ? (analysisResult?.trades ?? []).slice(-5).reverse() : [
                            { wallet: '0x4f2a...8c1d', timestamp: '14:32', size: 4200, price: 0.63, side: 'BUY' },
                            { wallet: '0x9b3e...2a4f', timestamp: '14:28', size: 1800, price: 0.61, side: 'SELL' },
                            { wallet: '0xf71c...dd3a', timestamp: '14:25', size: 890, price: 0.62, side: 'BUY' },
                            { wallet: '0x3d8b...1190', timestamp: '14:20', size: 15600, price: 0.60, side: 'BUY' },
                            { wallet: '0xa2c5...77ef', timestamp: '14:12', size: 320, price: 0.59, side: 'SELL' },
                          ]).map((t, i) => (
                            <tr key={i}>
                              <td className="td-addr">{typeof t.wallet === 'string' ? t.wallet : (t as { wallet: string }).wallet}</td>
                              <td>{typeof t.timestamp === 'string' ? (t.timestamp.length > 10 ? new Date(t.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : t.timestamp) : ''}</td>
                              <td>${typeof (t as { size?: number }).size === 'number' ? (t as { size: number }).size.toLocaleString() : (t as { size?: number }).size}</td>
                              <td>{(t as { price?: number }).price ?? 0}</td>
                              <td className={(t as { side?: string }).side === 'BUY' ? 'td-buy' : 'td-sell'}>{(t as { side?: string }).side ?? ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="analysis-right">
                  <div className="chat-card">
                    <div className="chat-header">
                      <div className="chat-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <img src="/reddog.png" alt="" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 4 }} />
                        Ask Big-Dawg
                      </div>
                      <div className="ai-tag">AI</div>
                    </div>
                    <div className="chat-tip" id="chatTip" dangerouslySetInnerHTML={{ __html: tipHtml }} />
                    <div className="chat-log" id="chatLog">
                      {chatMessages.map((m, i) => (
                        <div key={i} className={`cmsg ${m.role === 'user' ? 'u' : 'b'}`}>
                          <span className="crole">{m.role === 'user' ? 'You' : 'Big-Dawg'}</span>
                          <div className="cbubble">{m.text}</div>
                        </div>
                      ))}
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
                      <button type="button" className="send-btn" onClick={sendMsg}>↑</button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default App
