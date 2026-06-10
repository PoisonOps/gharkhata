import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { Spinner } from './components/Spinner'
import { BottomBar } from './components/BottomBar'
import { Fab } from './components/Fab'
import { Onboarding } from './screens/Onboarding/Onboarding'
import { AuthScreen } from './screens/Auth/AuthScreen'
import { Dashboard } from './screens/Dashboard/Dashboard'
import { AddExpense } from './screens/AddExpense/AddExpense'
import { Budget } from './screens/Budget/Budget'
import { RecurringScreen } from './screens/Recurring/RecurringScreen'
import { Settle } from './screens/Settle/Settle'
import { Insights } from './screens/Insights/Insights'

function AppShell() {
  const { user, loading: authLoading } = useAuth()
  const { profile, household, loading: profileLoading } = useProfile(user?.id)

  if (authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-surface dark:bg-zinc-950 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) return <AuthScreen />

  if (!profile || !household) {
    return <Onboarding userEmail={user.email ?? ''} />
  }

  return (
    <div className="min-h-screen bg-surface dark:bg-zinc-950">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/recurring" element={<RecurringScreen />} />
        <Route path="/settle" element={<Settle />} />
        <Route path="/insights" element={<Insights />} />
        <Route path="/add-expense" element={<AddExpense />} />
        <Route path="/edit-expense/:id" element={<AddExpense />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Fab to="/add-expense" />
      <BottomBar />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  )
}
