import { useCallback, useRef, useState } from 'react'
import { useInterview } from '../hooks/useInterview'
import { api } from '../services/api'

export default function SetupPage() {
  const {
    candidateName, resumeText, resumeFileName,
    sessionId, loading, error,
    setName, setResume, setSession, setLoading, setError, startInterview,
  } = useInterview()

  const [uploadStatus, setUploadStatus] = useState('')  // '', 'uploading', 'done', 'error'
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef()

  const handleFileUpload = useCallback(async (file) => {
    if (!file || !file.name.endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }
    setUploadStatus('uploading')
    setError(null)
    try {
      const result = await api.uploadResume(file)
      const sessionData = await api.prepareSession(result.resume_text)
      setResume(result.resume_text, file.name)
      setSession(sessionData.session_id)
      setUploadStatus('done')
    } catch (e) {
      setUploadStatus('error')
      setError(e.message)
    }
  }, [setResume, setSession, setError])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleStartInterview = async () => {
    if (!candidateName.trim()) {
      setError('Please enter your name.')
      return
    }
    setLoading(true)
    try {
      // If no resume uploaded, create a fresh session
      let sid = sessionId
      if (!sid) {
        const s = await api.prepareSession('')
        sid = s.session_id
        setSession(sid)
      }
      const data = await api.startInterview(candidateName.trim(), sid)
      startInterview(data)
    } catch (e) {
      setError(e.message)
    }
  }

  const skipResume = async () => {
    const s = await api.prepareSession('')
    setSession(s.session_id)
    setResume('', '')
    setUploadStatus('done')
  }

  return (
    <div className="setup-page">
      <div className="setup-card">
        {/* Header */}
        <div className="setup-header">
          <div className="logo-mark">PM</div>
          <h1>Mock Interview</h1>
          <p>Practice your PM interview with an AI interviewer.<br />Get real-time voice conversation + feedback.</p>
        </div>

        {/* Name Input */}
        <div className="field-group">
          <label className="field-label">Your Name</label>
          <input
            className="text-input"
            type="text"
            placeholder="e.g. Priya Sharma"
            value={candidateName}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStartInterview()}
          />
        </div>

        {/* Resume Upload */}
        <div className="field-group">
          <label className="field-label">
            Resume <span className="optional-tag">optional — personalizes questions</span>
          </label>
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''} ${uploadStatus === 'done' ? 'uploaded' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e.target.files[0])}
            />
            {uploadStatus === 'uploading' && (
              <div className="upload-state">
                <div className="spinner" />
                <span>Parsing resume...</span>
              </div>
            )}
            {uploadStatus === 'done' && (
              <div className="upload-state success">
                <span className="check-icon">✓</span>
                <span>{resumeFileName || 'Resume uploaded'}</span>
              </div>
            )}
            {uploadStatus === '' && (
              <div className="upload-state">
                <span className="upload-icon">📄</span>
                <span>Drop PDF here or <u>click to browse</u></span>
              </div>
            )}
            {uploadStatus === 'error' && (
              <div className="upload-state error-state">
                <span>⚠ Upload failed — try again</span>
              </div>
            )}
          </div>
          {uploadStatus === '' && (
            <button className="skip-btn" onClick={skipResume}>Skip — use generic questions</button>
          )}
        </div>

        {/* What to Expect */}
        <div className="expect-box">
          <h3>What to expect</h3>
          <div className="expect-grid">
            {[
              { icon: '🎙️', text: 'Voice conversation with AI interviewer' },
              { icon: '🧠', text: 'Product sense, metrics, strategy & behavioral' },
              { icon: '🔁', text: 'Dynamic follow-up questions' },
              { icon: '📊', text: 'Score + detailed feedback at the end' },
            ].map(({ icon, text }) => (
              <div key={text} className="expect-item">
                <span>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <button
          className="start-btn"
          onClick={handleStartInterview}
          disabled={loading || !candidateName.trim() || !sessionId}
        >
          {loading ? <><span className="spinner-sm" /> Starting...</> : '→ Start Interview'}
        </button>

        {!sessionId && candidateName && (
          <p className="hint">Upload a resume or click "Skip" to enable the start button.</p>
        )}
      </div>
    </div>
  )
}
