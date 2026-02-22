import type { Market, AnalysisResult } from './types'

const API_BASE = import.meta.env.VITE_API_URL || ''

export async function fetchMarkets(query?: string): Promise<Market[]> {
  if (!API_BASE) {
    return []
  }
  const url = query ? `${API_BASE}/api/markets?query=${encodeURIComponent(query)}` : `${API_BASE}/api/markets`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch markets')
  return res.json()
}

export async function analyzeMarket(conditionIdOrSlug: string): Promise<AnalysisResult> {
  if (!API_BASE) {
    throw new Error('No API URL configured. Set VITE_API_URL or run the Python backend.')
  }
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: conditionIdOrSlug }),
  })
  if (!res.ok) throw new Error('Analysis failed')
  return res.json()
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
