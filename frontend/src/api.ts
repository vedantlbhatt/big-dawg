import type { Market, AnalysisResult } from './types'

const API_BASE = import.meta.env.VITE_API_URL || ''

// Request cancellation support
let marketsFetchController: AbortController | null = null

export function cancelMarketsFetch() {
  if (marketsFetchController) {
    marketsFetchController.abort()
    marketsFetchController = null
  }
}

export async function fetchMarkets(query?: string): Promise<Market[]> {
  if (!API_BASE) {
    return []
  }
  
  // Cancel previous request if any
  cancelMarketsFetch()
  
  marketsFetchController = new AbortController()
  
  try {
    const url = query ? `${API_BASE}/api/markets?query=${encodeURIComponent(query)}&timeout=8` : `${API_BASE}/api/markets?timeout=8`
    const res = await fetch(url, {
      signal: marketsFetchController.signal,
      timeout: 10000  // 10 second client timeout
    })
    
    if (!res.ok) {
      if (res.status === 504) {
        throw new Error('Search timeout - try a simpler query or wait a moment')
      }
      throw new Error('Failed to fetch markets')
    }
    return res.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return []  // User cancelled
    }
    throw error
  } finally {
    marketsFetchController = null
  }
}

export async function analyzeMarket(conditionIdOrSlug: string): Promise<AnalysisResult> {
  if (!API_BASE) {
    throw new Error('No API URL configured. Set VITE_API_URL or run the Python backend.')
  }
  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: conditionIdOrSlug }),
      signal: AbortSignal.timeout(30000) // 30 second timeout for analysis
    })
    if (!res.ok) {
      if (res.status === 504) {
        throw new Error('Analysis timeout - this market may have insufficient data')
      }
      throw new Error('Analysis failed')
    }
    return res.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Analysis timeout - please try again')
    }
    throw error
  }
}

export async function chat(
  integrityRes: AnalysisResult['integrity_res'],
  infoRes: AnalysisResult['info_res'],
  confRes: AnalysisResult['conf_res'],
  message: string,
  history: { role: string; content: string }[]
): Promise<string> {
  if (!API_BASE) {
    return 'Configure VITE_API_URL and run the backend to use the chat.'
  }
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      integrity_res: integrityRes,
      info_res: infoRes,
      conf_res: confRes,
      message,
      history,
    }),
  })
  if (!res.ok) throw new Error('Chat failed')
  const data = await res.json()
  return data.response ?? ''
}
