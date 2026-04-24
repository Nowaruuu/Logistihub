import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-900">
        <div className="size-12 rounded-full border-4 border-orange-600 border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (user && !profile && !location.pathname.includes('/signup')) {
    // If authenticated but no profile, allow them to see the app so they can logout or re-register
    // But we might want to specifically handle this case in individual pages
    // For now, let's just let it pass so they are not stuck on a loading screen
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
