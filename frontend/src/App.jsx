import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import LandingPage     from './pages/LandingPage.jsx'
import AuthPage        from './pages/AuthPage.jsx'
import FarmerDashboard from './pages/FarmerDashboard.jsx'
import BuyerDashboard  from './pages/BuyerDashboard.jsx'
import TraceViewer     from './pages/TraceViewer.jsx'

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--cream)'
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid var(--mint)',
        borderTopColor: 'var(--forest)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"         element={<LandingPage />} />
          <Route path="/login"    element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/trace/:lotId" element={<TraceViewer />} />
          <Route path="/farmer"   element={
            <PrivateRoute role="farmer"><FarmerDashboard /></PrivateRoute>
          } />
          <Route path="/buyer"    element={
            <PrivateRoute role="buyer"><BuyerDashboard /></PrivateRoute>
          } />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}