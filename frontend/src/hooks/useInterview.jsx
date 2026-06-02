import { createContext, useCallback, useContext, useReducer } from 'react'

const InterviewContext = createContext(null)

const initialState = {
  step: 'home',           // home | setup | interview | results
  candidateName: '',
  resumeText: '',
  resumeFileName: '',
  sessionId: null,
  roomName: null,
  livekitUrl: null,
  token: null,
  feedback: null,
  transcript: [],
  error: null,
  loading: false,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING': return { ...state, loading: action.payload, error: null }
    case 'SET_ERROR':   return { ...state, error: action.payload, loading: false }
    case 'SET_RESUME':  return { ...state, resumeText: action.payload.text, resumeFileName: action.payload.name }
    case 'SET_NAME':    return { ...state, candidateName: action.payload }
    case 'SET_SESSION': return { ...state, sessionId: action.payload }
    case 'GO_SETUP':    return { ...state, step: 'setup' }
    case 'START_INTERVIEW': return {
      ...state,
      step: 'interview',
      sessionId: action.payload.sessionId,
      roomName: action.payload.roomName,
      livekitUrl: action.payload.livekitUrl,
      token: action.payload.token,
      loading: false,
      error: null,
    }
    case 'END_INTERVIEW': return {
      ...state,
      step: 'results',
      feedback: action.payload.feedback,
      loading: false,
    }
    case 'RESET': return { ...initialState }
    default: return state
  }
}

export function InterviewProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const setName = useCallback((name) => dispatch({ type: 'SET_NAME', payload: name }), [])
  const setResume = useCallback((text, name) => dispatch({ type: 'SET_RESUME', payload: { text, name } }), [])
  const setSession = useCallback((id) => dispatch({ type: 'SET_SESSION', payload: id }), [])
  const goSetup = useCallback(() => dispatch({ type: 'GO_SETUP' }), [])
  const setLoading = useCallback((v) => dispatch({ type: 'SET_LOADING', payload: v }), [])
  const setError = useCallback((e) => dispatch({ type: 'SET_ERROR', payload: e }), [])

  const startInterview = useCallback((data) => {
    dispatch({
      type: 'START_INTERVIEW',
      payload: {
        sessionId: data.session_id,
        roomName: data.room_name,
        livekitUrl: data.livekit_url,
        token: data.token,
      },
    })
  }, [])

  const endInterview = useCallback((feedback) => {
    dispatch({ type: 'END_INTERVIEW', payload: { feedback } })
  }, [])

  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return (
    <InterviewContext.Provider value={{
      ...state, setName, setResume, setSession, goSetup,
      startInterview, endInterview, reset, setLoading, setError,
    }}>
      {children}
    </InterviewContext.Provider>
  )
}

export const useInterview = () => {
  const ctx = useContext(InterviewContext)
  if (!ctx) throw new Error('useInterview must be inside InterviewProvider')
  return ctx
}
