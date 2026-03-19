import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  async function doLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate('/');
    } catch (_) {
      navigate('/');
    }
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  const planColors: Record<string, { bg: string; color: string }> = {
    startup: { bg: '#ede9fe', color: '#6d28d9' },
    enterprise: { bg: '#dbeafe', color: '#1d4ed8' },
    global: { bg: '#dcfce7', color: '#15803d' },
  };
  const planStyle = planColors[(tenant?.plan || 'startup').toLowerCase()] || planColors.startup;

  return (
    <div className="app-shell">
      {/* Status bar spacer */}
      <div style={{ background: '#0a1628', height: 0 }} />

      {/* Profile header */}
      <div style={{ background: '#0a1628', padding: '52px 24px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontFamily: "'DM Mono', monospace", letterSpacing: '.07em' }}>
              {(tenant?.slug || slug || '').toUpperCase()}
            </p>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 2 }}>
              {tenant?.company_name || 'LogistiHub'}
            </h1>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            style={{
              width: 38, height: 38, borderRadius: 10, border: 'none',
              background: 'rgba(255,255,255,.08)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'rgba(255,255,255,.5)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>

        {/* Avatar + name card */}
        <div style={{
          background: '#fff', borderRadius: '16px 16px 0 0',
          padding: '24px 24px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingBottom: 0
        }}>
          {/* Avatar */}
          <div style={{
            width: 76, height: 76, borderRadius: '50%',
            background: '#0a1628', border: '4px solid #fff',
            boxShadow: '0 4px 20px rgba(10,22,40,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.02em',
            marginTop: -10, flexShrink: 0
          }}>
            {initials}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0a1628', marginTop: 12 }}>
            {user?.first_name} {user?.last_name}
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{user?.email}</p>
          <span className="badge" style={{
            ...planStyle,
            marginTop: 10, marginBottom: 20
          }}>
            {(tenant?.plan || 'Startup').toUpperCase()} PLAN
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, background: '#fff', overflowY: 'auto', padding: '0 24px 32px' }}>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 24px' }} />

        {/* Info grid */}
        <SectionTitle icon="person" label="Personal Information" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <InfoTile icon="badge" label="First Name" value={user?.first_name || '—'} />
          <InfoTile icon="badge" label="Last Name" value={user?.last_name || '—'} />
          <InfoTile icon="mail" label="Email" value={user?.email || '—'} full />
          <InfoTile icon="phone" label="Phone" value={user?.phone || '—'} />
          <InfoTile icon="fiber_manual_record" label="Status" value={user?.status || 'active'}
            valueColor={user?.status === 'active' ? '#15803d' : '#94a3b8'} />
        </div>

        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 24px' }} />

        {/* Address */}
        <SectionTitle icon="location_on" label="Delivery Address" />
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12,
          padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
          marginBottom: 24
        }}>
          <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: 18, marginTop: 2, flexShrink: 0 }}>home</span>
          <p style={{ fontSize: 13, color: user?.address ? '#334155' : '#94a3b8', lineHeight: 1.5 }}>
            {user?.address || 'No address on file'}
          </p>
        </div>

        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 24px' }} />

        {/* Tenant info */}
        <SectionTitle icon="business" label="Logistics Provider" />
        <div style={{
          background: '#0a1628', borderRadius: 12, padding: '16px',
          display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24
        }}>
          <div style={{
            width: 44, height: 44, background: 'rgba(255,255,255,.1)',
            borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 22 }}>package_2</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {tenant?.company_name || 'LogistiHub'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
              {tenant?.business_type || 'Logistics'} · /{tenant?.slug || slug}
            </div>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '4px 10px',
            borderRadius: 99, ...planStyle
          }}>
            {(tenant?.plan || 'STARTUP').toUpperCase()}
          </span>
        </div>

        {/* Account created */}
        {user?.created_at && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 11, color: '#94a3b8', marginBottom: 28
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
            Member since {new Date(user.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric'
            })}
          </div>
        )}

        {/* Logout button */}
        <button
          className="btn btn-danger"
          onClick={() => setShowLogoutModal(true)}
          style={{ gap: 8 }}
        >
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>

      {/* Logout modal */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,22,40,.5)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 100, animation: 'fadeIn .2s ease'
        }}>
          <div style={{
            background: '#fff', borderRadius: '20px 20px 0 0',
            padding: '28px 24px 40px', width: '100%', maxWidth: 430,
            animation: 'fadeUp .25s ease'
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14, background: '#fef2f2',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14
            }}>
              <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: 24 }}>logout</span>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0a1628', marginBottom: 6 }}>Sign out?</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
              You'll be signed out of <strong>{tenant?.company_name || slug}</strong> on this device.
            </p>
            <button className="btn btn-danger" onClick={doLogout} disabled={loggingOut} style={{ marginBottom: 10 }}>
              {loggingOut
                ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Signing out…</>
                : <><span className="material-symbols-outlined">logout</span> Yes, Sign Out</>
              }
            </button>
            <button className="btn btn-ghost" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        {label}
      </span>
    </div>
  );
}

function InfoTile({ icon, label, value, full, valueColor }: {
  icon: string; label: string; value: string; full?: boolean; valueColor?: string;
}) {
  return (
    <div style={{
      gridColumn: full ? '1 / -1' : undefined,
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 10, padding: '12px 14px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13, color: '#94a3b8' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {label}
        </span>
      </div>
      <div style={{
        fontSize: 13, fontWeight: 600, color: valueColor || '#0a1628',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
      }}>
        {value}
      </div>
    </div>
  );
}
