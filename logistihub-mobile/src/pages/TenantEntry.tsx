import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function TenantEntry() {
  const [slug, setSlugInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const { setSlug } = useAuth();
  const navigate = useNavigate();

  // If slug already saved (from deep link or previous session) skip this screen
  useEffect(() => {
    const saved = localStorage.getItem('lh_slug');
    if (saved) {
      navigate('/' + saved + '/login', { replace: true });
    }
  }, []);

  async function handleContinue() {
    const s = slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (!s) { setErr('Please enter your company workspace.'); return; }
    setLoading(true);
    setErr('');
    try {
      const res = await fetch('https://logistihub.ddns.net/' + s + '/api/tenant-info');
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data?.suspended) {
        setErr(data?.message || 'This workspace has been temporarily suspended by LogistiHub.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Workspace not found.');
      if (!data.tenant) throw new Error('Workspace not found.');
      setSlug(s);
      navigate('/' + s + '/login');
    } catch (e: any) {
      setErr(e.message || 'Could not find that workspace.');
      setLoading(false);
    }
  }

  return (
    <div className="app-shell" style={{ justifyContent: 'center', padding: '32px 24px' }}>
      {/* Logo */}
      <div className="animate-fadeUp" style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 64, height: 64, background: '#0a1628', borderRadius: 18,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          boxShadow: '0 8px 32px rgba(10,22,40,.18)'
        }}>
          <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 32 }}>package_2</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0a1628', letterSpacing: '-.02em' }}>LogistiHub</h1>
        <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Your logistics, connected.</p>
      </div>

      {/* Card */}
      <div className="card animate-fadeUp" style={{ padding: '28px 24px', animationDelay: '.08s' }}>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#0a1628', marginBottom: 4 }}>Enter your workspace</h2>
        <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 20 }}>
          Ask your logistics provider for your company slug.
        </p>

        {err && (
          <div className="err-box" style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined">error</span>
            <span>{err}</span>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
            Company Workspace (slug)
          </label>
          <div style={{ position: 'relative' }}>
            <span className="material-symbols-outlined" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#cbd5e1', fontSize: 18, pointerEvents: 'none'
            }}>business</span>
            <input
              type="text"
              placeholder="e.g. fastship-logistics"
              value={slug}
              onChange={e => setSlugInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleContinue()}
              style={{ paddingLeft: 40 }}
            />
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 5, fontStyle: 'italic' }}>
            logistihub.ddns.net/<strong>{slug || 'your-slug'}</strong>
          </p>
        </div>

        <button
          className="btn btn-primary"
          style={{ marginTop: 16 }}
          onClick={handleContinue}
          disabled={loading}
        >
          {loading
            ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Checking…</>
            : <><span className="material-symbols-outlined">arrow_forward</span> Continue</>
          }
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 24 }}>
        Not a customer yet? Contact your logistics provider to get access.
      </p>
    </div>
  );
}
