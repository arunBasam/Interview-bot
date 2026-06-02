import {
  LiveKitRoom,
  RoomAudioRenderer,
  useVoiceAssistant,
  BarVisualizer,
  useRoomContext,
  useTracks,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track } from 'livekit-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useInterview } from '../hooks/useInterview'
import { api } from '../services/api'

// ── Inner component (must be inside LiveKitRoom) ──────────────────────────────
function InterviewSession() {
  const { state: agentState, audioTrack } = useVoiceAssistant()
  const room = useRoomContext()
  const { sessionId, endInterview, setLoading, setError, candidateName } = useInterview()
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding] = useState(false)
  const [transcript, setTranscript] = useState([])
  const transcriptRef = useRef(null)
  const timerRef = useRef(null)

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [])

  // Capture transcript from data messages sent by agent
  useEffect(() => {
    const handleData = (payload) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload))
        if (msg.type === 'transcript_turn') {
          setTranscript(prev => [...prev, msg])
          setTimeout(() => {
            transcriptRef.current?.scrollTo({ top: 99999, behavior: 'smooth' })
          }, 100)
        }
      } catch {}
    }
    room.on('dataReceived', handleData)
    return () => room.off('dataReceived', handleData)
  }, [room])

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const handleEnd = useCallback(async () => {
    if (ending) return
    setEnding(true)
    clearInterval(timerRef.current)
    try {
      const result = await api.endInterview(sessionId)
      endInterview(result.feedback)
    } catch (e) {
      setError(e.message)
      setEnding(false)
    }
  }, [sessionId, ending, endInterview, setError])

  const stateLabel = {
    connecting: 'Connecting...',
    initializing: 'Interviewer joining...',
    listening: '🎙 Listening',
    thinking: '💭 Thinking...',
    speaking: '🔊 Speaking',
    idle: 'Ready',
  }[agentState] || agentState

  const stateClass = {
    listening: 'state-listening',
    speaking: 'state-speaking',
    thinking: 'state-thinking',
  }[agentState] || ''

  return (
    <div className="interview-room">
      {/* Top bar */}
      <div className="interview-topbar">
        <div className="topbar-left">
          <div className="interview-badge">LIVE</div>
          <span className="interview-title">PM Mock Interview</span>
          <span className="candidate-chip">{candidateName}</span>
        </div>
        <div className="topbar-right">
          <span className="timer">{formatTime(elapsed)}</span>
          <button className="end-btn" onClick={handleEnd} disabled={ending}>
            {ending ? 'Ending...' : 'End Interview'}
          </button>
        </div>
      </div>

      <div className="interview-body">
        {/* AI Visualizer */}
        <div className="visualizer-panel">
          <div className="ai-avatar">
            <div className={`ai-ring ${stateClass}`} />
            <div className="ai-core">AI</div>
          </div>

          <div className={`agent-state-pill ${stateClass}`}>
            {stateLabel}
          </div>

          <div className="visualizer-wrap">
            {audioTrack && (
              <BarVisualizer
                trackRef={audioTrack}
                barCount={24}
                style={{ height: '60px', width: '240px' }}
              />
            )}
          </div>

          <p className="interviewer-name">Alex · PM Interviewer</p>

          <div className="mic-hint">
            {agentState === 'listening'
              ? '🎙 Speak now — Alex is listening'
              : agentState === 'speaking'
              ? '🔊 Alex is speaking...'
              : 'Wait for Alex to finish speaking'}
          </div>
        </div>

        {/* Transcript Panel */}
        <div className="transcript-panel">
          <div className="transcript-header">Conversation Transcript</div>
          <div className="transcript-scroll" ref={transcriptRef}>
            {transcript.length === 0 && (
              <div className="transcript-empty">
                Transcript will appear here as the conversation progresses...
              </div>
            )}
            {transcript.map((turn, i) => (
              <div key={i} className={`transcript-turn ${turn.role === 'assistant' ? 'ai-turn' : 'user-turn'}`}>
                <div className="turn-label">{turn.role === 'assistant' ? 'Alex' : candidateName}</div>
                <div className="turn-text">{turn.text}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RoomAudioRenderer />
    </div>
  )
}

// ── Outer wrapper with LiveKitRoom ────────────────────────────────────────────
export default function InterviewPage() {
  const { livekitUrl, token, setError } = useInterview()

  if (!token || !livekitUrl) return null

  return (
    <LiveKitRoom
      serverUrl={livekitUrl}
      token={token}
      connect={true}
      video={false}
      audio={true}
      onError={(e) => setError(e.message)}
    >
      <InterviewSession />
    </LiveKitRoom>
  )
}
