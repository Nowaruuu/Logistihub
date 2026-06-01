import { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Suspended from '../pages/Suspended';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, isLoading, isSuspended, suspendedCompany } = useAuth();
  const { slug } = useParams<{ slug: string }>();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#f1f5f9'
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#cbd5e1', animation: 'spin 1s linear infinite' }}>
          progress_activity
        </span>
      </div>
    );
  }

  if (isSuspended) {
    return <Suspended companyName={suspendedCompany} />;
  }

  if (!user) {
    return <Navigate to={`/${slug}/login`} replace />;
  }

  return <>{children}</>;
}
