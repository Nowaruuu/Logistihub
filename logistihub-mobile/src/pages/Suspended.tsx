import { useNavigate } from 'react-router-dom';

export default function Suspended({ companyName }: { companyName?: string }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('lh_token');
    localStorage.removeItem('lh_slug');
    localStorage.removeItem('lh_user');
    localStorage.removeItem('lh_tenant');
    navigate('/', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        padding: '40px 28px',
        maxWidth: '380px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
      }}>
        {/* Icon */}
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '50%',
          background: '#fef2f2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          border: '3px solid #fecaca',
          fontSize: '36px',
        }}>
          ⛔
        </div>

        <h1 style={{
          fontSize: '22px',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '12px',
          letterSpacing: '-0.02em',
        }}>
          Workspace Suspended
        </h1>

        <p style={{
          fontSize: '14px',
          color: '#64748b',
          lineHeight: 1.7,
          marginBottom: '24px',
        }}>
          {companyName ? (
            <>
              <strong style={{ color: '#0f172a' }}>{companyName}</strong> has been temporarily suspended by <strong style={{ color: '#0f172a' }}>LogistiHub</strong> due to an overdue subscription payment.
            </>
          ) : (
            <>This workspace has been temporarily suspended by <strong style={{ color: '#0f172a' }}>LogistiHub</strong> due to an overdue subscription payment.</>
          )}
        </p>

        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '28px',
          textAlign: 'left',
        }}>
          <p style={{ fontSize: '13px', color: '#991b1b', lineHeight: 1.6, margin: 0 }}>
            All services are currently unavailable. Please contact your company administrator for more information.
          </p>
        </div>

        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: '14px',
            border: 'none',
            background: '#0f172a',
            color: '#fff',
            fontSize: '15px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Switch Workspace
        </button>
      </div>
    </div>
  );
}
