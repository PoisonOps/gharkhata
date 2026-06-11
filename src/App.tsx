import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { AppProvider, useApp } from './context/AppContext'
import { Spinner } from './components/Spinner'
import { BottomBar } from './components/BottomBar'
import { Fab } from './components/Fab'
import { SyncBadge } from './components/SyncBadge'
import { Onboarding } from './screens/Onboarding/Onboarding'
import { AuthScreen } from './screens/Auth/AuthScreen'
import { Dashboard } from './screens/Dashboard/Dashboard'
import { AddExpense } from './screens/AddExpense/AddExpense'
import { Budget } from './screens/Budget/Budget'
import { RecurringScreen } from './screens/Recurring/RecurringScreen'
import { Settle } from './screens/Settle/Settle'
import { Insights } from './screens/Insights/Insights'

function InnerApp({ userEmail }: { userEmail: string }) {
  const { profile, loading, online } = useApp()

  if (loading) {
    return (
      <div className="min-h-screen bg-surface dark:bg-zinc-950 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  // No Dexie data + offline = first-ever launch without internet
  if (profile === undefined && !online) {
    return (
      <div className="min-h-screen bg-surface dark:bg-zinc-950 flex flex-col items-center justify-center px-8 text-center gap-3">
        <span className="text-4xl">📡</span>
        <p className="text-base font-medium dark:text-zinc-100">Connect to internet</p>
        <p className="text-sm text-zinc-400">Open GharKhata online at least once to set up your account. After that it works fully offline.</p>
      </div>
    )
  }

  // Not set up yet — show onboarding
  if (!profile?.household_id) {
    return <Onboarding userEmail={userEmail} />
  }

  return (
    <>
      <SyncBadge />
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
    </>
  )
}

function AppShell() {
  const { user, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface dark:bg-zinc-950 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!user) return <AuthScreen />

  return (
    <AppProvider userId={user.id}>
      <InnerApp userEmail={user.email ?? ''} />
    </AppProvider>
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
