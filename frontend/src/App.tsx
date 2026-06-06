import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import MainLayout from '@/layouts/MainLayout'

import LoginPage from '@/pages/LoginPage'
import OverviewPage from '@/pages/OverviewPage'
import LiveMapPage from '@/pages/LiveMapPage'
import FleetPage from '@/pages/FleetPage'
import DriversPage from '@/pages/DriversPage'
import TripsPage from '@/pages/TripsPage'
import MaintenancePage from '@/pages/MaintenancePage'
import FuelPage from '@/pages/FuelPage'
import GeofencesPage from '@/pages/GeofencesPage'
import AlertsPage from '@/pages/AlertsPage'
import PayrollPage from '@/pages/PayrollPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import SettingsPage from '@/pages/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function ProtectedPage({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <MainLayout>{children}</MainLayout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/overview" element={<ProtectedPage><OverviewPage /></ProtectedPage>} />
            <Route path="/map" element={<ProtectedPage><LiveMapPage /></ProtectedPage>} />
            <Route path="/fleet" element={<ProtectedPage><FleetPage /></ProtectedPage>} />
            <Route path="/drivers" element={<ProtectedPage><DriversPage /></ProtectedPage>} />
            <Route path="/trips" element={<ProtectedPage><TripsPage /></ProtectedPage>} />
            <Route path="/maintenance" element={<ProtectedPage><MaintenancePage /></ProtectedPage>} />
            <Route path="/fuel" element={<ProtectedPage><FuelPage /></ProtectedPage>} />
            <Route path="/geofences" element={<ProtectedPage><GeofencesPage /></ProtectedPage>} />
            <Route path="/alerts" element={<ProtectedPage><AlertsPage /></ProtectedPage>} />
            <Route path="/payroll" element={<ProtectedPage><PayrollPage /></ProtectedPage>} />
            <Route path="/analytics" element={<ProtectedPage><AnalyticsPage /></ProtectedPage>} />
            <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}
