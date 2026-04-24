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

// Driver Pages
import VehicleInfo from './pages/driver/VehicleInfo';
import Earnings from './pages/driver/Earnings';
import Stats from './pages/driver/Stats';
import Documents from './pages/driver/Documents';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />

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
            <Route path="/driver/vehicle" element={
              <AuthGuard>
                <Layout>
                  <VehicleInfo />
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

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
