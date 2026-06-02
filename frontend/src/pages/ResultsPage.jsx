import { useEffect, useState } from 'react'
import { useInterview } from '../hooks/useInterview'
import { api } from '../services/api'

const CATEGORY_LABELS = {
  product_sense: 'Product Sense',
  metrics_execution: 'Metrics & Execution',
  strategy: 'Strategy',
  behavioral: 'Behavioral',
  communication: 'Communication',
}

const RECOMMENDATION_COLOR = {
  'Strong Hire': '#22c55e',
  'Hire': '#86efac',
  'Borderline': '#fbbf24',
  'No Hire': '#f87171',
}

function ScoreRing({ score, size = 80 }) {
  const pct = (score / 10) * 100
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ

  const color = score >= 8 ? '#22c55e' : score >= 6 ? '#60a5fa' : score >= 4 ? '#fbbf24' : '#f87171'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
      <circle
        cx={size/2} cy={size/2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill={color} fontSize={size * 0.22} fontWeight="700">
        {score}/10
      </text>
    </svg>
  )
}

export default function ResultsPage() {
  const { feedback, sessionId, candidateName, reset } = useInterview()
  const [transcript, setTranscript] = useState([])
  const [showTranscript, setShowTranscript] = useState(false)

  useEffect(() => {
    if (sessionId) {
      api.getSession(sessionId).then(s => setTranscript(s.transcript || [])).catch(() => {})
    }
  }, [sessionId])

  if (!feedback) {
    return (
      <div className="results-page loading-results">
        <div className="spinner-lg" />
        <p>Generating your feedback...</p>
      </div>
    )
  }

  const recColor = RECOMMENDATION_COLOR[feedback.hiring_recommendation] || '#94a3b8'

  return (
    <div className="results-page">
      <div className="results-container">
        {/* Header */}
        <div className="results-header">
          <h1>Interview Complete</h1>
          <p className="results-subtitle">Here's how {candidateName || 'you'} performed</p>
        </div>

        {/* Overall score + recommendation */}
        <div className="score-hero">
          <div className="score-ring-wrap">
            <ScoreRing score={feedback.overall_score} size={120} />
            <div className="score-label">Overall Score</div>
          </div>
          <div className="summary-block">
            <div className="hiring-badge" style={{ borderColor: recColor, color: recColor }}>
              {feedback.hiring_recommendation}
            </div>
            <p className="summary-text">{feedback.summary}</p>
          </div>
        </div>

        {/* Category breakdown */}
        {feedback.categories && Object.keys(feedback.categories).length > 0 && (
          <div className="categories-section">
            <h2>Category Breakdown</h2>
            <div className="categories-grid">
              {Object.entries(feedback.categories).map(([key, val]) => (
                <div key={key} className="category-card">
                  <div className="category-top">
                    <span className="category-name">{CATEGORY_LABELS[key] || key}</span>
                    <ScoreRing score={val.score} size={56} />
                  </div>
                  <p className="category-feedback">{val.feedback}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Improvements */}
        <div className="insights-row">
          {feedback.strengths?.length > 0 && (
            <div className="insight-card strengths-card">
              <h3>✦ Strengths</h3>
              <ul>
                {feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          {feedback.improvements?.length > 0 && (
            <div className="insight-card improvements-card">
              <h3>↗ Areas to Improve</h3>
              <ul>
                {feedback.improvements.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Transcript */}
        {transcript.length > 0 && (
          <div className="transcript-section">
            <button className="toggle-transcript" onClick={() => setShowTranscript(v => !v)}>
              {showTranscript ? '▲ Hide Transcript' : '▼ View Full Transcript'}
            </button>
            {showTranscript && (
              <div className="full-transcript">
                {transcript.map((turn, i) => (
                  <div key={i} className={`tr-turn ${turn.role === 'assistant' ? 'ai' : 'user'}`}>
                    <div className="tr-label">{turn.role === 'assistant' ? 'Alex (AI)' : candidateName}</div>
                    <div className="tr-text">{turn.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="results-actions">
          <button className="retry-btn" onClick={reset}>Practice Again</button>
        </div>
      </div>
    </div>
  )
}
