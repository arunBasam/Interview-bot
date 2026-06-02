import { InterviewProvider, useInterview } from './hooks/useInterview'
import SetupPage from './pages/SetupPage'
import InterviewPage from './pages/InterviewPage'
import ResultsPage from './pages/ResultsPage'
import './styles.css'

function AppRouter() {
  const { step } = useInterview()

  if (step === 'interview') return <InterviewPage />
  if (step === 'results')   return <ResultsPage />
  return <SetupPage />
}

export default function App() {
  return (
    <InterviewProvider>
      <AppRouter />
    </InterviewProvider>
  )
}
