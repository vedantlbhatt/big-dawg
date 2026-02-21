import { useState } from 'react'
import type { ChatMessage } from '../types'
import type { IntegrityResult, InformationResult, ConfidenceResult } from '../types'

interface ChatProps {
  marketName: string
  integrityRes: IntegrityResult
  infoRes: InformationResult
  confRes: ConfidenceResult
  messages: ChatMessage[]
  onSend: (message: string) => Promise<string>
}

export function Chat({
  marketName,
  integrityRes,
  infoRes,
  confRes,
  messages,
  onSend,
}: ChatProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    try {
      await onSend(text)
    } finally {
      setLoading(false)
    }
  }

  const greeting =
    messages.length === 0
      ? `I've extracted signals for the market: **${marketName}**
- Integrity: **${integrityRes.status}**
- Sentiment: **${infoRes.classification}**
- Confidence: **${confRes.confidence_level}**

How can I help you interpret this market data?`
      : null

  return (
    <div className="metric-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginTop: 0 }}>Intelligence Chat</h3>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 200 }}>
        {greeting && (
          <div className="chat-bubble bot" style={{ whiteSpace: 'pre-wrap' }}>
            {greeting}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`chat-bubble ${msg.role === 'human' ? 'user' : 'bot'}`}
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div className="chat-bubble bot" style={{ color: '#888' }}>
            …
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="primary" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  )
}
