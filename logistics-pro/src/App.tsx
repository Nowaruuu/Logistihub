import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ThemeProvider } from './hooks/useTheme';
import AuthGuard from './components/AuthGuard';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import SendPackage from './pages/SendPackage';
import MyPackages from './pages/MyPackages';
import TrackShipment from './pages/TrackShipment';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Stations from './pages/Stations';
import RateCalculator from './pages/RateCalculator';
import AddressBook from './pages/AddressBook';
import PaymentMethods from './pages/PaymentMethods';
import Settings from './pages/Settings';
import HelpCenter from './pages/HelpCenter';
import DataExport from './pages/DataExport';
import ForceChangePassword from './pages/ForceChangePassword';

// Driver Pages
import DriverDashboard from './pages/DriverDashboard';
import VehicleInfo from './pages/driver/VehicleInfo';
import VehicleRequest from './pages/driver/VehicleRequest';
import Earnings from './pages/driver/Earnings';
import Stats from './pages/driver/Stats';
import Documents from './pages/driver/Documents';
import DriverNavigate from './pages/driver/Navigate';

// Global Error Boundary — catches ANY uncaught render crash in child components
class AppErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: string}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(err: any) { return { hasError: true, error: String(err) }; }
  componentDidCatch(error: any, info: any) { console.error('App crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#0f172a', color:'white', padding:'2rem', textAlign:'center' }}>
          <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📦</div>
          <h2 style={{ fontSize:'1.5rem', fontWeight:'bold', marginBottom:'0.5rem' }}>Something went wrong</h2>
          <p style={{ color:'#94a3b8', fontSize:'0.875rem', marginBottom:'0.75rem' }}>The page encountered an error. Please try again.</p>
          <p style={{ color:'#f87171', fontSize:'0.7rem', marginBottom:'1.5rem', maxWidth:'300px', wordBreak:'break-all' }}>{this.state.error}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: '' }); window.location.href = '/dashboard'; }}
            style={{ background:'#ea580c', color:'white', padding:'0.75rem 2rem', borderRadius:'0.75rem', border:'none', fontWeight:'bold', fontSize:'0.875rem', cursor:'pointer' }}
          >
            Return to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppErrorBoundary>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/force-change-password" element={<ForceChangePassword />} />

            <Route path="/" element={<SignIn />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <AuthGuard>
                <Layout>
                  <Dashboard />
                </Layout>
              </AuthGuard>
            } />
            
            <Route path="/send" element={
              <AuthGuard>
                <Layout>
                  <SendPackage />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/packages" element={
              <AuthGuard>
                <Layout>
                  <MyPackages />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/track/:trackingNumber" element={
              <AuthGuard>
                <Layout>
                  <TrackShipment />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/profile" element={
              <AuthGuard>
                <Layout>
                  <Profile />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/notifications" element={
              <AuthGuard>
                <Layout>
                  <Notifications />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/stations" element={
              <AuthGuard>
                <Layout>
                  <Stations />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/calculator" element={
              <AuthGuard>
                <Layout>
                  <RateCalculator />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/address-book" element={
              <AuthGuard>
                <Layout>
                  <AddressBook />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/payment-methods" element={
              <AuthGuard>
                <Layout>
                  <PaymentMethods />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/settings" element={
              <AuthGuard>
                <Layout>
                  <Settings />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/help" element={
              <AuthGuard>
                <Layout>
                  <HelpCenter />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/export" element={
              <AuthGuard>
                <Layout>
                  <DataExport />
                </Layout>
              </AuthGuard>
            } />

            {/* Driver Routes */}
            <Route path="/driver/jobs" element={
              <AuthGuard>
                <Layout>
                  <DriverDashboard />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/driver/vehicle" element={
              <AuthGuard>
                <Layout>
                  <VehicleInfo />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/driver/vehicle-request" element={
              <AuthGuard>
                <Layout>
                  <VehicleRequest />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/driver/earnings" element={
              <AuthGuard>
                <Layout>
                  <Earnings />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/driver/stats" element={
              <AuthGuard>
                <Layout>
                  <Stats />
                </Layout>
              </AuthGuard>
            } />

            <Route path="/driver/documents" element={
              <AuthGuard>
                <Layout>
                  <Documents />
                </Layout>
              </AuthGuard>
            } />

            {/* Fullscreen navigation — no Layout (no nav bars) */}
            <Route path="/driver/navigate" element={
              <AuthGuard>
                <DriverNavigate />
              </AuthGuard>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
        </AppErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  );
}
