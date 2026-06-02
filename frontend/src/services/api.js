const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Upload resume PDF, get back extracted text
  uploadResume: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${API_URL}/api/upload-resume`, { method: 'POST', body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },

  // Pre-create a session tied to resume text
  prepareSession: (resumeText) =>
    request('/api/prepare-session', {
      method: 'POST',
      body: JSON.stringify({ resume_text: resumeText }),
    }),

  // Get LiveKit room token and start interview
  startInterview: (candidateName, sessionId) =>
    request('/api/start-interview', {
      method: 'POST',
      body: JSON.stringify({ candidate_name: candidateName, session_id: sessionId }),
    }),

  // End interview and trigger feedback
  endInterview: (sessionId) =>
    request('/api/end-interview', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    }),

  // Fetch session data (transcript + feedback)
  getSession: (sessionId) => request(`/api/session/${sessionId}`),
}
