export interface EventItem {
  id: string
  cat: string
  emoji: string
  catLbl: string
  title: string
  sub: string
  markets: number
  vol: string
}

export interface BetItem {
  id: number
  title: string
  yes: number
  vol: string
  live: boolean
  trust: number
  trustCls: 'trust' | 'caution' | 'risk'
  smartLean: string
  smartLeanDir: 'yes' | 'no' | 'split'
}

export interface WalletItem {
  label: string
  addr: string
  belief: number
  side: 'yes' | 'no' | 'neutral'
  badge: 'early' | 'heavy' | 'streak' | null
  badgeLbl: string | null
  vol: string
  rank: string
}

export interface WalletIntelData {
  lean: 'yes' | 'no' | 'split'
  leanPct: number
  divergence: 'Low' | 'Medium' | 'High'
  wallets: WalletItem[]
}

export interface AnalysisItem {
  trust: number
  trustCls: 'trust' | 'caution' | 'risk'
  line: string
  desc: string
  int_ans: string
  int_desc: string
  int_cls: 'good' | 'ok' | 'bad'
  sent_ans: string
  sent_desc: string
  sent_cls: 'good' | 'ok' | 'bad'
  conf_ans: string
  conf_desc: string
  conf_cls: 'good' | 'ok' | 'bad'
  tip: string
}

export const events: EventItem[] = [
  { id: 'midterms', cat: 'politics', emoji: '🇺🇸', catLbl: 'Politics', title: '2026 US Midterms', sub: 'House, Senate, Governorships', markets: 4, vol: '$89M' },
  { id: 'btc', cat: 'crypto', emoji: '₿', catLbl: 'Crypto', title: 'Bitcoin 2025', sub: 'Price milestones & ETF flows', markets: 6, vol: '$42M' },
  { id: 'iran', cat: 'geo', emoji: '🛢', catLbl: 'Geopolitics', title: 'US-Iran Tensions', sub: 'Strikes, sanctions, diplomacy', markets: 3, vol: '$343M' },
  { id: 'fed', cat: 'finance', emoji: '🏦', catLbl: 'Finance', title: 'Fed Rate Decisions', sub: 'March, May, June meetings', markets: 5, vol: '$28M' },
  { id: 'laliga', cat: 'sports', emoji: '⚽', catLbl: 'La Liga', title: 'La Liga Week 26', sub: 'Match odds & scorelines', markets: 8, vol: '$12M' },
  { id: 'ai', cat: 'tech', emoji: '🤖', catLbl: 'Tech', title: 'AI Milestones 2025', sub: 'GPT-5, Gemini, open source', markets: 7, vol: '$9M' },
  { id: 'oscars', cat: 'geo', emoji: '🎬', catLbl: 'Entertainment', title: 'Oscars 2026', sub: 'Best Picture, Director & more', markets: 10, vol: '$6M' },
  { id: 'trump', cat: 'politics', emoji: '🏛', catLbl: 'Politics', title: 'Trump Policy Watch', sub: 'Tariffs, courts, executive orders', markets: 12, vol: '$156M' },
]

export const bets: Record<string, BetItem[]> = {
  midterms: [
    { id: 1, title: 'Republicans win the House?', yes: 62, vol: '$4.2M', live: false, trust: 76, trustCls: 'trust', smartLean: 'YES 68%', smartLeanDir: 'yes' },
    { id: 2, title: 'Democrats flip the Senate?', yes: 31, vol: '$2.1M', live: false, trust: 61, trustCls: 'caution', smartLean: 'NO 71%', smartLeanDir: 'no' },
    { id: 3, title: 'GOP net gain of 10+ House seats?', yes: 44, vol: '$890K', live: false, trust: 54, trustCls: 'caution', smartLean: 'Split', smartLeanDir: 'split' },
    { id: 4, title: 'Voter turnout above 50%?', yes: 71, vol: '$340K', live: false, trust: 82, trustCls: 'trust', smartLean: 'YES 79%', smartLeanDir: 'yes' },
  ],
  btc: [
    { id: 5, title: 'Bitcoin above $100k by Dec 2025?', yes: 51, vol: '$2.8M', live: true, trust: 48, trustCls: 'caution', smartLean: 'Split', smartLeanDir: 'split' },
    { id: 6, title: 'New Bitcoin ATH in Q1 2025?', yes: 67, vol: '$1.2M', live: false, trust: 70, trustCls: 'trust', smartLean: 'YES 72%', smartLeanDir: 'yes' },
  ],
  iran: [
    { id: 7, title: 'US strikes Iran by March 15?', yes: 47, vol: '$343M', live: false, trust: 39, trustCls: 'risk', smartLean: 'Split', smartLeanDir: 'split' },
    { id: 8, title: 'Iran nuclear deal by mid-2025?', yes: 12, vol: '$8M', live: false, trust: 65, trustCls: 'trust', smartLean: 'NO 82%', smartLeanDir: 'no' },
  ],
  fed: [
    { id: 9, title: 'Fed cuts 50+ bps in March?', yes: 1, vol: '$113K', live: false, trust: 88, trustCls: 'trust', smartLean: 'NO 96%', smartLeanDir: 'no' },
    { id: 10, title: 'Rate cut in May meeting?', yes: 34, vol: '$2.4M', live: false, trust: 71, trustCls: 'trust', smartLean: 'NO 61%', smartLeanDir: 'no' },
  ],
  laliga: [
    { id: 11, title: 'CA Osasuna to beat Real Madrid?', yes: 55, vol: '$3M', live: true, trust: 72, trustCls: 'trust', smartLean: 'YES 59%', smartLeanDir: 'yes' },
    { id: 12, title: 'Real Madrid win La Liga 2024/25?', yes: 78, vol: '$6M', live: false, trust: 80, trustCls: 'trust', smartLean: 'YES 81%', smartLeanDir: 'yes' },
  ],
  ai: [
    { id: 13, title: 'GPT-5 releases before July 2026?', yes: 34, vol: '$760K', live: false, trust: 55, trustCls: 'caution', smartLean: 'Split', smartLeanDir: 'split' },
  ],
  oscars: [
    { id: 14, title: 'Conclave wins Best Picture?', yes: 42, vol: '$1.1M', live: false, trust: 68, trustCls: 'trust', smartLean: 'YES 55%', smartLeanDir: 'yes' },
  ],
  trump: [
    { id: 15, title: 'Court forces Trump to refund tariffs?', yes: 17, vol: '$113K', live: false, trust: 80, trustCls: 'trust', smartLean: 'NO 78%', smartLeanDir: 'no' },
  ],
}

const defaultWallets: WalletItem[] = [
  { label: '🏆 #1', addr: '0x4f2a...8c1d', belief: 72, side: 'yes', badge: 'streak', badgeLbl: 'Win streak', vol: '$48K', rank: 'Top 1%' },
  { label: '🥈 #2', addr: '0x9b3e...2a4f', belief: 65, side: 'yes', badge: 'early', badgeLbl: 'Early entry', vol: '$31K', rank: 'Top 3%' },
  { label: '🥉 #3', addr: '0xf71c...dd3a', belief: 70, side: 'yes', badge: 'heavy', badgeLbl: 'High conviction', vol: '$22K', rank: 'Top 5%' },
  { label: '#4', addr: '0x3d8b...1190', belief: 58, side: 'yes', badge: 'early', badgeLbl: 'Early entry', vol: '$18K', rank: 'Top 8%' },
  { label: '#5', addr: '0xa2c5...77ef', belief: 38, side: 'no', badge: null, badgeLbl: null, vol: '$14K', rank: 'Top 12%' },
]

export const walletData: Record<string, WalletIntelData> = {
  default: {
    lean: 'yes',
    leanPct: 68,
    divergence: 'Low',
    wallets: defaultWallets,
  },
  '5': {
    lean: 'split',
    leanPct: 52,
    divergence: 'High',
    wallets: [
      { label: '🏆 #1', addr: '0x7c1d...3fa2', belief: 71, side: 'yes', badge: 'heavy', badgeLbl: 'High conviction', vol: '$62K', rank: 'Top 1%' },
      { label: '🥈 #2', addr: '0x2e8b...09ca', belief: 48, side: 'neutral', badge: 'early', badgeLbl: 'Early entry', vol: '$44K', rank: 'Top 2%' },
      { label: '🥉 #3', addr: '0xbb3a...5511', belief: 35, side: 'no', badge: null, badgeLbl: null, vol: '$28K', rank: 'Top 4%' },
      { label: '#4', addr: '0x01fa...c290', belief: 62, side: 'yes', badge: 'streak', badgeLbl: 'Win streak', vol: '$19K', rank: 'Top 7%' },
      { label: '#5', addr: '0xde44...7f1c', belief: 29, side: 'no', badge: 'heavy', badgeLbl: 'Heavy seller', vol: '$16K', rank: 'Top 11%' },
    ],
  },
  '7': {
    lean: 'split',
    leanPct: 49,
    divergence: 'High',
    wallets: [
      { label: '🏆 #1', addr: '0xc9aa...8831', belief: 55, side: 'yes', badge: null, badgeLbl: null, vol: '$120K', rank: 'Top 1%' },
      { label: '🥈 #2', addr: '0x44bc...0d1e', belief: 42, side: 'no', badge: 'early', badgeLbl: 'Early entry', vol: '$88K', rank: 'Top 2%' },
      { label: '🥉 #3', addr: '0x8f22...6c90', belief: 61, side: 'yes', badge: 'heavy', badgeLbl: 'High conviction', vol: '$70K', rank: 'Top 3%' },
      { label: '#4', addr: '0x3311...ab44', belief: 33, side: 'no', badge: null, badgeLbl: null, vol: '$55K', rank: 'Top 5%' },
      { label: '#5', addr: '0x19fe...2244', belief: 50, side: 'neutral', badge: null, badgeLbl: null, vol: '$40K', rank: 'Top 6%' },
    ],
  },
}

const defaultAnalysis: AnalysisItem = {
  trust: 76,
  trustCls: 'trust',
  line: 'This market looks legit.',
  desc: 'Informed traders are running this one. Low whale activity, clear consensus. That 62% is a real signal.',
  int_ans: 'Not really',
  int_desc: 'No suspicious clusters, no dominant wallets. Very organic activity.',
  int_cls: 'good',
  sent_ans: 'Smart money',
  sent_desc: "74% of trades from wallets with strong track records. That's high.",
  sent_cls: 'good',
  conf_ans: 'Very confident',
  conf_desc: 'Traders mostly agree. Price has been stable for days. 84% data quality.',
  conf_cls: 'good',
  tip: '<b>Quick take:</b> Clean market. Smart money leans YES 68%. The 62% is trustworthy — bet accordingly.',
}

export const analysisData: Record<number, AnalysisItem> = {
  1: defaultAnalysis,
  2: {
    trust: 61,
    trustCls: 'caution',
    line: 'Proceed with caution.',
    desc: 'Some whale activity and mixed signals from smart wallets. Directionally correct but read the fine print.',
    int_ans: 'A bit sketchy',
    int_desc: 'One whale dominates ~30% of volume. Price jumped 8% in 2 hours earlier today.',
    int_cls: 'ok',
    sent_ans: 'Mixed signals',
    sent_desc: 'Half informed, half retail chasing momentum. Not the cleanest read.',
    sent_cls: 'ok',
    conf_ans: 'Moderate',
    conf_desc: 'Traders disagree more than usual. Price has drifted 6% this week.',
    conf_cls: 'ok',
    tip: '<b>Mixed signals:</b> Smart money leans NO 71% but there\'s whale noise. Use caution before betting big.',
  },
  5: {
    trust: 48,
    trustCls: 'caution',
    line: 'Noisy. Could go either way.',
    desc: 'Whales are active and smart wallets are split down the middle. The 51% is basically a coin flip right now.',
    int_ans: 'A bit sketchy',
    int_desc: 'Multiple large wallets moved price significantly in the last 48 hours.',
    int_cls: 'ok',
    sent_ans: 'Whale vs retail',
    sent_desc: 'Whale activity (42%) and retail momentum (38%) are battling it out.',
    sent_cls: 'ok',
    conf_ans: 'Moderate',
    conf_desc: 'Wide disagreement — Brier-ranked traders are on both sides. Signal is noisy.',
    conf_cls: 'ok',
    tip: '<b>Watch out:</b> Smart wallets are split 50/50. This 51% means very little right now.',
  },
  7: {
    trust: 39,
    trustCls: 'risk',
    line: "Something's off here.",
    desc: '$343M in volume but chaotic trading patterns. High retail emotion, possible coordinated pumps. The signal is polluted.',
    int_ans: 'High risk',
    int_desc: 'Suspicious trade timing clusters and coordinated wallet activity detected.',
    int_cls: 'bad',
    sent_ans: 'Retail chaos',
    sent_desc: 'Dominated by emotional retail trading. Very low informed signal.',
    sent_cls: 'bad',
    conf_ans: 'Low confidence',
    conf_desc: 'Price swung ±15% in 24 hours. Traders wildly disagree.',
    conf_cls: 'bad',
    tip: '<b>Red flag:</b> $343M volume but the signal quality is poor. Manipulation patterns detected — tread carefully.',
  },
  9: {
    trust: 88,
    trustCls: 'trust',
    line: 'Crystal clear signal.',
    desc: "Almost everyone agrees this won't happen. Expert economists lined up on NO. Rock solid 1%.",
    int_ans: 'Very clean',
    int_desc: 'No manipulation. Small, consistent activity from economic policy traders.',
    int_cls: 'good',
    sent_ans: 'Expert-driven',
    sent_desc: 'Predominantly informed economic/policy wallets. Exceptionally high credibility.',
    sent_cls: 'good',
    conf_ans: 'Rock solid',
    conf_desc: '91% confidence. Extremely low disagreement. Price flat for weeks.',
    conf_cls: 'good',
    tip: '<b>Clear as day:</b> Smart money nearly unanimous on NO (96%). The 1% YES is priced-in noise.',
  },
}

/** All markets (bets) flattened with their event, for the single markets list. */
export interface MarketWithEvent {
  bet: BetItem
  event: EventItem
}

export const allMarkets: MarketWithEvent[] = events.flatMap((event) =>
  (bets[event.id] ?? []).map((bet) => ({ bet, event }))
)

export function getAnalysisForBet(betId: number): AnalysisItem {
  return analysisData[betId] ?? analysisData[1] ?? defaultAnalysis
}

export function getWalletIntelForBet(betId: number): WalletIntelData {
  return walletData[String(betId)] ?? walletData.default
}
