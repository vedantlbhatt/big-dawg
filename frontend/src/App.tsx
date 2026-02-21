import { useState, useRef } from 'react'
import {
  allMarkets,
  getAnalysisForBet,
  getWalletIntelForBet,
  type EventItem,
  type BetItem,
} from './data'

type Page = 'landing' | 'markets' | 'analysis'

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

function App() {
  const [page, setPage] = useState<Page>('landing')
  const [overlayOn, setOverlayOn] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null)
  const [selectedBet, setSelectedBet] = useState<BetItem | null>(null)
  const [walletsExpanded, setWalletsExpanded] = useState(false)
  const [tradesOpen, setTradesOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const replyIdx = useRef(0)

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

  const analysis = selectedBet ? getAnalysisForBet(selectedBet.id) : null
  const walletIntel = selectedBet ? getWalletIntelForBet(selectedBet.id) : null

  const sendMsg = () => {
    const val = chatInput.trim()
    if (!val) return
    setChatMessages((prev) => [...prev, { role: 'user', text: val }])
    setChatInput('')
    const idx = replyIdx.current % botReplies.length
    replyIdx.current += 1
    const reply = botReplies[idx](selectedBet?.id ?? 1)
    setTimeout(() => {
      setChatMessages((prev) => [...prev, { role: 'bot', text: reply }])
    }, 550)
  }

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
            {selectedBet && (
              <>
                <span className="crumb-sep">/</span>
                <span className="crumb-item active">{selectedBet.title.slice(0, 28)}…</span>
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
          <div className="lstat"><div className="lstat-val">$2.4B</div><div className="lstat-lab">Volume Tracked</div></div>
          <div style={{ width: 1, background: 'var(--border2)' }} />
          <div className="lstat"><div className="lstat-val">1,247</div><div className="lstat-lab">Live Markets</div></div>
          <div style={{ width: 1, background: 'var(--border2)' }} />
          <div className="lstat"><div className="lstat-val">98ms</div><div className="lstat-lab">Avg Analysis</div></div>
        </div>
      </div>

      {/* MARKETS — all markets in one list */}
      <div className={`page ${page === 'markets' ? 'on' : ''}`} id="marketsPage">
        <div className="events-hero">
          <div className="events-title">All <em>markets</em></div>
          <div className="events-sub">Click any market to see trust score, wallet intel, and analysis.</div>
        </div>
        <div className="bets-grid" style={{ padding: '0 28px 60px' }} id="marketsGrid">
          {allMarkets.map(({ bet: b, event: e }) => (
            <div
              key={b.id}
              className="bet-card"
              onClick={() => {
                setSelectedEvent(e)
                setSelectedBet(b)
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
          ))}
        </div>
      </div>

      {/* ANALYSIS */}
      <div className={`page ${page === 'analysis' ? 'on' : ''}`} id="analysisPage">
        <div className="analysis-wrap">
          {selectedBet && analysis && (
            <>
              <div className="verdict-hero">
                <div className="verdict-mkt-row">
                  <div className="verdict-mkt-emoji">{selectedEvent?.emoji ?? '🗳'}</div>
                  <div className="verdict-mkt-name" id="vName">{selectedBet.title}</div>
                </div>
                <div className="trust-ring">
                  <svg viewBox="0 0 148 148">
                    <circle className="ring-bg" cx="74" cy="74" r="58" />
                    <circle
                      className={`ring-fill ${analysis.trustCls}`}
                      id="ringFill"
                      cx="74"
                      cy="74"
                      r="58"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * analysis.trust) / 100}
                    />
                  </svg>
                  <div className="ring-center">
                    <div className={`ring-num ${analysis.trustCls}`} id="ringNum">{analysis.trust}</div>
                    <div className="ring-word">Trust Score</div>
                  </div>
                </div>
                <div className="verdict-line" id="vLine">{analysis.line}</div>
                <div className="verdict-desc" id="vDesc">{analysis.desc}</div>
                <div className="prob-row">
                  <div className="prob-block"><div className="prob-pct yes" id="vYes">{selectedBet.yes}%</div><div className="prob-out">YES</div></div>
                  <div className="prob-sep" /><div className="prob-vs">vs</div><div className="prob-sep" />
                  <div className="prob-block"><div className="prob-pct no" id="vNo">{100 - selectedBet.yes}%</div><div className="prob-out">NO</div></div>
                </div>
                <div className="verdict-btns">
                  <button type="button" className="vbet yes" id="vBetYes">Buy YES · {selectedBet.yes}¢</button>
                  <button type="button" className="vbet no" id="vBetNo">Buy NO · {100 - selectedBet.yes}¢</button>
                </div>
              </div>

              <div className="analysis-body">
                <div className="analysis-left">
                  <div className="tiles-row">
                    <div className={`tile ${analysis.int_cls}`} id="tile1">
                      <div className="tile-icon">🛡</div>
                      <div className="tile-q">Is it manipulated?</div>
                      <div className={`tile-answer ${analysis.int_cls}`} id="t1ans">{analysis.int_ans}</div>
                      <div className="tile-desc" id="t1desc">{analysis.int_desc}</div>
                      <div className="tile-bars">
                        <div className="tbar-row"><span className="tbar-name">Whale</span><div className="tbar-track"><div className="tbar-fill" style={{ width: '22%', background: 'var(--lime)' }} /></div><span className="tbar-val">0.22</span></div>
                        <div className="tbar-row"><span className="tbar-name">Flip</span><div className="tbar-track"><div className="tbar-fill" style={{ width: '12%', background: 'var(--lime)' }} /></div><span className="tbar-val">0.12</span></div>
                        <div className="tbar-row"><span className="tbar-name">Cluster</span><div className="tbar-track"><div className="tbar-fill" style={{ width: '9%', background: 'var(--lime)' }} /></div><span className="tbar-val">0.09</span></div>
                      </div>
                    </div>
                    <div className={`tile ${analysis.sent_cls}`} id="tile2">
                      <div className="tile-icon">🧠</div>
                      <div className="tile-q">Who's trading it?</div>
                      <div className={`tile-answer ${analysis.sent_cls}`} id="t2ans">{analysis.sent_ans}</div>
                      <div className="tile-desc" id="t2desc">{analysis.sent_desc}</div>
                      <div className="tile-bars">
                        <div className="tbar-row"><span className="tbar-name">Informed</span><div className="tbar-track"><div className="tbar-fill" style={{ width: '74%', background: 'var(--lime)' }} /></div><span className="tbar-val">74%</span></div>
                        <div className="tbar-row"><span className="tbar-name">Whale</span><div className="tbar-track"><div className="tbar-fill" style={{ width: '16%', background: 'var(--purple)' }} /></div><span className="tbar-val">16%</span></div>
                        <div className="tbar-row"><span className="tbar-name">Retail</span><div className="tbar-track"><div className="tbar-fill" style={{ width: '10%', background: 'var(--blue)' }} /></div><span className="tbar-val">10%</span></div>
                      </div>
                    </div>
                    <div className={`tile ${analysis.conf_cls}`} id="tile3">
                      <div className="tile-icon">🎯</div>
                      <div className="tile-q">How sure is the signal?</div>
                      <div className={`tile-answer ${analysis.conf_cls}`} id="t3ans">{analysis.conf_ans}</div>
                      <div className="tile-desc" id="t3desc">{analysis.conf_desc}</div>
                      <div className="tile-bars">
                        <div className="tbar-row"><span className="tbar-name">Quality</span><div className="tbar-track"><div className="tbar-fill" style={{ width: '84%', background: 'var(--lime)' }} /></div><span className="tbar-val">84%</span></div>
                        <div className="tbar-row"><span className="tbar-name">Conviction</span><div className="tbar-track"><div className="tbar-fill" style={{ width: '71%', background: 'var(--purple)' }} /></div><span className="tbar-val">71%</span></div>
                      </div>
                    </div>
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
                      <svg className="price-svg" viewBox="0 0 600 160" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="ca" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#b9f751" stopOpacity={0.14} />
                            <stop offset="100%" stopColor="#b9f751" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <g className="c-grid">
                          <line x1="0" y1="25" x2="600" y2="25" /><line x1="0" y1="65" x2="600" y2="65" />
                          <line x1="0" y1="105" x2="600" y2="105" /><line x1="0" y1="145" x2="600" y2="145" />
                        </g>
                        <g className="c-axis">
                          <text x="2" y="23">80%</text><text x="2" y="63">70%</text>
                          <text x="2" y="103">60%</text><text x="2" y="143">50%</text>
                        </g>
                        <g className="c-axis">
                          <text x="38" y="158">00:00</text><text x="168" y="158">06:00</text>
                          <text x="295" y="158">12:00</text><text x="428" y="158">18:00</text>
                          <text x="552" y="158">Now</text>
                        </g>
                        <path className="c-area" d="M38,130 C70,122 90,112 120,100 C150,88 165,115 196,97 C226,80 238,110 268,95 C296,82 315,62 348,55 C378,49 398,74 430,65 C460,57 480,43 512,37 C535,32 550,50 578,43 L578,160 L38,160 Z" />
                        <path className="c-line" d="M38,130 C70,122 90,112 120,100 C150,88 165,115 196,97 C226,80 238,110 268,95 C296,82 315,62 348,55 C378,49 398,74 430,65 C460,57 480,43 512,37 C535,32 550,50 578,43" />
                        <circle cx="578" cy="43" r="4" fill="#b9f751" />
                        <circle cx="578" cy="43" r="9" fill="#b9f751" opacity={0.14} />
                        <rect x="582" y="33" width="32" height="15" rx="4" fill="rgba(185,247,81,.14)" stroke="rgba(185,247,81,.3)" strokeWidth={0.5} />
                        <text x="598" y="43.5" textAnchor="middle" fontSize="8" fill="#b9f751" fontFamily="Figtree" fontWeight="700" id="chartProb">{selectedBet.yes}%</text>
                      </svg>
                    </div>
                  </div>

                  <div className={`trades-card ${tradesOpen ? 'open' : ''}`} id="tradesCard">
                    <div className="trades-tog" onClick={() => setTradesOpen((x) => !x)} role="button" tabIndex={0}>
                      <span>Raw trades <span style={{ color: 'var(--text3)', fontSize: 11, fontWeight: 500 }}>· 247 trades</span></span>
                      <span className="trades-arrow">▼</span>
                    </div>
                    <div className="trades-body">
                      <table className="trades-tbl">
                        <thead><tr><th>Wallet</th><th>Time</th><th>Size</th><th>Price</th><th>Side</th></tr></thead>
                        <tbody>
                          <tr><td className="td-addr">0x4f2a...8c1d</td><td>14:32</td><td>$4,200</td><td>0.63</td><td className="td-buy">BUY</td></tr>
                          <tr><td className="td-addr">0x9b3e...2a4f</td><td>14:28</td><td>$1,800</td><td>0.61</td><td className="td-sell">SELL</td></tr>
                          <tr><td className="td-addr">0xf71c...dd3a</td><td>14:25</td><td>$890</td><td>0.62</td><td className="td-buy">BUY</td></tr>
                          <tr><td className="td-addr">0x3d8b...1190</td><td>14:20</td><td>$15,600</td><td>0.60</td><td className="td-buy">BUY</td></tr>
                          <tr><td className="td-addr">0xa2c5...77ef</td><td>14:12</td><td>$320</td><td>0.59</td><td className="td-sell">SELL</td></tr>
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
                    <div className="chat-tip" id="chatTip" dangerouslySetInnerHTML={{ __html: analysis.tip }} />
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
