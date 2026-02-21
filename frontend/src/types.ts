export interface Market {
  event_title: string
  question: string
  slug: string
  volume: number
  conditionId: string
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

export interface AnalysisResult {
  market_name: string
  integrity_res: IntegrityResult
  info_res: InformationResult
  conf_res: ConfidenceResult
  price_series: { timestamp: string; price: number }[]
  trades_count: number
}

export interface ChatMessage {
  role: 'human' | 'assistant'
  content: string
}
