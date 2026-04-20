import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AuthGuard } from './components/AuthGuard';
import TenantEntry from './pages/TenantEntry';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

// Handles deep link slug detection on app first open
function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    // If slug already saved, nothing to do
    const savedSlug = localStorage.getItem('lh_slug');
    if (savedSlug) return;

    // Try to read slug from URL path
    // e.g. app opened via logistihub.ddns.net/amogus/get-app
    const path = window.location.pathname;
    const match = path.match(/^\/([a-z0-9-]+)\//);
    if (match && match[1]) {
      const deepSlug = match[1];
      // Save slug silently
      localStorage.setItem('lh_slug', deepSlug);
      // Skip TenantEntry, go straight to login
      navigate('/' + deepSlug + '/login', { replace: true });
    }
  }, []);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        {/* Deep link handler runs on every app open */}
        <DeepLinkHandler />
        <Routes>
          {/* Root — only shown if no slug saved */}
          <Route path="/" element={<TenantEntry />} />

          {/* Tenant-scoped routes */}
          <Route path="/:slug/login"    element={<Login />} />
          <Route path="/:slug/register" element={<Register />} />
          <Route
            path="/:slug/dashboard"
            element={
              <AuthGuard>
                <Dashboard />
              </AuthGuard>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}