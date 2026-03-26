import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { slug } = useParams<{ slug: string }>();
  const { login, tenant, setSlug } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (slug) setSlug(slug);
  }, [slug]);

  async function doLogin() {
    if (!email || !password) { setErr('Please enter your email and password.'); return; }
    if (!slug) { setErr('No workspace selected.'); return; }
    setErr('');
    setLoading(true);
    try {
      await login(slug, email, password);
      navigate(`/${slug}/dashboard`);
    } catch (e: any) {
      setErr(e.message || 'Login failed. Check your credentials.');
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {/* Top header with tenant branding */}
      <div style={{
        background: '#0a1628',
        padding: '48px 24px 32px',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 42, height: 42, background: 'rgba(255,255,255,.1)',
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 22 }}>package_2</span>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
              {tenant?.company_name || 'LogistiHub'}
            </div>
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,.35)',
              fontFamily: "'DM Mono', monospace", letterSpacing: '.08em', marginTop: 1
            }}>
              {slug} · CLIENT PORTAL
            </div>
          </div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>Welcome back</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>
          Sign in to track your shipments
        </p>
      </div>

      {/* Form card */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        <div className="card animate-fadeUp" style={{ padding: '24px' }}>

          {err && (
            <div className="err-box" style={{ marginBottom: 16 }}>
              <span className="material-symbols-outlined">error</span>
              <span>{err}</span>
            </div>
          )}

          {/* Email */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#cbd5e1', fontSize: 18, pointerEvents: 'none'
              }}>mail</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: 40 }}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <span className="material-symbols-outlined" style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: '#cbd5e1', fontSize: 18, pointerEvents: 'none'
              }}>lock</span>
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && doLogin()}
                style={{ paddingLeft: 40, paddingRight: 44 }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8',
                  display: 'flex', alignItems: 'center', padding: 4
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {showPw ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button className="btn btn-primary" onClick={doLogin} disabled={loading}>
            {loading
              ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Signing in…</>
              : <><span className="material-symbols-outlined">login</span> Sign In</>
            }
          </button>

          <div className="divider" style={{ margin: '20px 0 16px' }}>or</div>

          <Link to={`/${slug}/register`} style={{ textDecoration: 'none' }}>
            <button className="btn btn-ghost" type="button">
              <span className="material-symbols-outlined">person_add</span>
              Create an account
            </button>
          </Link>
        </div>

        {/* Switch workspace */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/" style={{
            fontSize: 12, color: '#94a3b8', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>swap_horiz</span>
            Switch workspace
          </Link>
        </div>

        {/* Security note */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8,
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9,
          padding: '10px 12px', marginTop: 16
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#94a3b8', marginTop: 1, flexShrink: 0 }}>shield</span>
          <p style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            Your connection is encrypted. All login attempts are logged and rate-limited.
          </p>
        </div>
      </div>
    </div>
  );
}
