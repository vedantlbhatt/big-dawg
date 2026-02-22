export interface Market {
  event_title: string
  question: string
  slug: string
  volume: number
  conditionId: string
  trust_score?: number | null
  integrity_status?: string | null
  classification?: string | null
  yes_vol?: number
  no_vol?: number
}

export interface IntegrityResult {
  score: number
  status: string
  components: {
    whale_risk: number
    price_impact_risk: number
    liquidity_risk: number
    flip_risk: number
    cluster_risk: number
  }
}

export interface InformationResult {
  classification: string
  components: {
    informed_score: number
    retail_score: number
    whale_score: number
  }
}

export interface ConfidenceResult {
  probability: number
  disagreement_std: number
  disagreement: string
  confidence_score: number
  data_quality: number
  confidence_level: string
  conviction_score?: number
}

export interface WalletIntelWallet {
  label: string
  addr: string
  belief: number
  side: 'yes' | 'no' | 'neutral'
  badge: string | null
  badgeLbl: string | null
  vol: string
  rank: string
}

export interface WalletIntel {
  lean: 'yes' | 'no' | 'split'
  leanPct: number
  divergence: 'Low' | 'Medium' | 'High'
  wallets: WalletIntelWallet[]
}

export interface Recommendation {
  action: string
  color: string
  reasoning: string
}

export interface AnalysisResult {
  market_name: string
  integrity_res: IntegrityResult
  info_res: InformationResult
  conf_res: ConfidenceResult
  master_res: {
    market_stats?: { total_trades?: number; unique_wallets?: number; latest_price?: number }
    overall_score: number
    verdict: string
    wallet_intelligence?: { star_count?: number; aggregate_star_capital?: number; stars?: unknown[] }
  }
  recommendation?: Recommendation
  wallet_intel?: WalletIntel
  price_series: { timestamp: string; price: number }[]
  trades: { wallet: string; timestamp: string; size: number; price: number; side: string }[]
  trades_count: number
}

export interface ChatMessage {
  role: 'human' | 'assistant'
  content: string
}
