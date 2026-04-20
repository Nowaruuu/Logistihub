import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { slug } = useParams<{ slug: string }>();
  const { register, tenant, setSlug } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    password: '', confirm_password: '', address: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [step, setStep] = useState<1|2>(1);

  useEffect(() => { if (slug) setSlug(slug); }, [slug]);

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function validateStep1() {
    if (!form.first_name.trim()) { setErr('First name is required.'); return false; }
    if (!form.last_name.trim()) { setErr('Last name is required.'); return false; }
    if (!form.email.trim() || !form.email.includes('@')) { setErr('Valid email is required.'); return false; }
    if (!form.phone.trim()) { setErr('Phone number is required.'); return false; }
    return true;
  }

  function goStep2() {
    setErr('');
    if (validateStep1()) setStep(2);
  }

  async function doRegister() {
    setErr('');
    if (!form.password || form.password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    if (form.password !== form.confirm_password) { setErr('Passwords do not match.'); return; }
    if (!slug) { setErr('No workspace.'); return; }
    setLoading(true);
    try {
      await register(slug, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        address: form.address
      });
      navigate(`/${slug}/dashboard`);
    } catch (e: any) {
      setErr(e.message || 'Registration failed. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      {/* Header */}
      <div style={{ background: '#0a1628', padding: '48px 24px 28px', flexShrink: 0 }}>
        <Link to={`/${slug}/login`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          color: 'rgba(255,255,255,.5)', fontSize: 12, textDecoration: 'none', marginBottom: 16
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
          Back to login
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{
            width: 36, height: 36, background: 'rgba(255,255,255,.1)',
            borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18 }}>package_2</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>
            {tenant?.company_name || slug}
          </div>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>Create account</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', marginTop: 4 }}>
          Join {tenant?.company_name || 'your logistics provider'}
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginTop: 20 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              height: 3, flex: 1, borderRadius: 99,
              background: s <= step ? '#fff' : 'rgba(255,255,255,.2)',
              transition: 'background .3s'
            }} />
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>
          Step {step} of 2 — {step === 1 ? 'Your Details' : 'Set Password'}
        </p>
      </div>

      {/* Form */}
      <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {err && (
          <div className="err-box animate-fadeIn" style={{ marginBottom: 16 }}>
            <span className="material-symbols-outlined">error</span>
            <span>{err}</span>
          </div>
        )}

        {step === 1 && (
          <div className="card animate-slideIn" style={{ padding: '24px' }}>
            <FieldRow>
              <Field label="First Name" icon="person" value={form.first_name}
                onChange={v => update('first_name', v)} placeholder="Juan" />
              <Field label="Last Name" icon="person" value={form.last_name}
                onChange={v => update('last_name', v)} placeholder="dela Cruz" />
            </FieldRow>
            <Field label="Email Address" icon="mail" type="email" value={form.email}
              onChange={v => update('email', v)} placeholder="juan@example.com" />
            <Field label="Phone Number" icon="phone" type="tel" value={form.phone}
              onChange={v => update('phone', v)} placeholder="+63 9XX XXX XXXX" />
            <Field label="Address (optional)" icon="home" value={form.address}
              onChange={v => update('address', v)} placeholder="123 Main St, Quezon City" />

            <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={goStep2}>
              <span className="material-symbols-outlined">arrow_forward</span>
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="card animate-slideIn" style={{ padding: '24px' }}>
            {/* Summary */}
            <div style={{
              background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 9,
              padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10
            }}>
              <div style={{
                width: 36, height: 36, background: '#0a1628', borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18 }}>person</span>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0a1628' }}>
                  {form.first_name} {form.last_name}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{form.email}</div>
              </div>
              <button
                onClick={() => setStep(1)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
              </button>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
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
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex'
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {showPw ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: '#cbd5e1', fontSize: 18, pointerEvents: 'none'
                }}>lock_check</span>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirm_password}
                  onChange={e => update('confirm_password', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && doRegister()}
                  style={{ paddingLeft: 40 }}
                />
              </div>
              {form.password && form.confirm_password && (
                <div style={{
                  fontSize: 11, marginTop: 5, display: 'flex', alignItems: 'center', gap: 4,
                  color: form.password === form.confirm_password ? '#15803d' : '#dc2626'
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
                    {form.password === form.confirm_password ? 'check_circle' : 'cancel'}
                  </span>
                  {form.password === form.confirm_password ? 'Passwords match' : 'Passwords do not match'}
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={doRegister} disabled={loading}>
              {loading
                ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Creating account…</>
                : <><span className="material-symbols-outlined">how_to_reg</span> Create Account</>
              }
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', marginTop: 20 }}>
          Already have an account?{' '}
          <Link to={`/${slug}/login`} style={{ color: '#0a1628', fontWeight: 700, textDecoration: 'none' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 0 }}>
      {children}
    </div>
  );
}

function Field({
  label, icon, type = 'text', value, onChange, placeholder
}: {
  label: string; icon: string; type?: string;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <span className="material-symbols-outlined" style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: '#cbd5e1', fontSize: 18, pointerEvents: 'none'
        }}>{icon}</span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{ paddingLeft: 40 }}
        />
      </div>
    </div>
  );
}
