import { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user, tenant, logout, updateProfile, uploadProfilePicture } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ── Edit Profile state ──────────────────────────────────────────────────────
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openEdit() {
    setEditForm({
      first_name: user?.first_name || '',
      last_name:  user?.last_name  || '',
      phone:      user?.phone      || '',
    });
    setSaveErr('');
    setSaveOk(false);
    setShowEdit(true);
  }

  async function doSave() {
    if (!editForm.phone.trim()) { setSaveErr('Phone number is required.'); return; }
    setSaving(true);
    setSaveErr('');
    try {
      await updateProfile({
        first_name: editForm.first_name.trim() || undefined,
        last_name:  editForm.last_name.trim()  || undefined,
        phone:      editForm.phone.trim(),
      });
      setSaveOk(true);
      setTimeout(() => setShowEdit(false), 900);
    } catch (e: any) {
      setSaveErr(e.message || 'Failed to save. Try again.');
    } finally {
      setSaving(false);
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  async function doLogout() {
    setLoggingOut(true);
    try { await logout(); navigate('/'); } catch (_) { navigate('/'); }
  }

  function handlePickPhoto() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';
    // Read as base64
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Image = reader.result as string;
      if (!base64Image || !base64Image.startsWith('data:image/')) return;
      setUploadingPhoto(true);
      try {
        await uploadProfilePicture(base64Image);
      } catch (err: any) {
        console.error('Profile picture upload failed', err);
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  }

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  const planColors: Record<string, { bg: string; color: string }> = {
    startup:    { bg: '#ede9fe', color: '#6d28d9' },
    enterprise: { bg: '#dbeafe', color: '#1d4ed8' },
    global:     { bg: '#dcfce7', color: '#15803d' },
  };
  const planStyle = planColors[(tenant?.plan || 'startup').toLowerCase()] || planColors.startup;

  return (
    <div className="app-shell">
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
            style={{ width: 38, height: 38, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.5)' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '24px 24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 0 }}>
          <div style={{ position: 'relative', width: 76, height: 76, marginTop: -10, flexShrink: 0 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#0a1628', border: '4px solid #fff', boxShadow: '0 4px 20px rgba(10,22,40,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', overflow: 'hidden' }}>
              {user?.profile_picture
                ? <img src={user.profile_picture} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : initials}
            </div>
            <button
              onClick={handlePickPhoto}
              disabled={uploadingPhoto}
              style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: '50%', border: '2px solid #fff', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
            >
              {uploadingPhoto
                ? <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#fff', animation: 'spin 1s linear infinite' }}>progress_activity</span>
                : <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#fff' }}>photo_camera</span>}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0a1628', marginTop: 12 }}>{user?.first_name} {user?.last_name}</h2>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>{user?.email}</p>
          <span className="badge" style={{ ...planStyle, marginTop: 10, marginBottom: 20 }}>
            {(tenant?.plan || 'Startup').toUpperCase()} PLAN
          </span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, background: '#fff', overflowY: 'auto', padding: '0 24px 32px' }}>
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 24px' }} />

        {/* Personal Info header with Edit button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <SectionTitle icon="person" label="Personal Information" />
          <button
            onClick={openEdit}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#475569' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>edit</span>
            Edit
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <InfoTile icon="badge"  label="First Name" value={user?.first_name || '—'} />
          <InfoTile icon="badge"  label="Last Name"  value={user?.last_name  || '—'} />
          <InfoTile icon="mail"   label="Email"      value={user?.email      || '—'} full />
          <InfoTile icon="phone"  label="Phone"      value={user?.phone      || '—'} valueColor={user?.phone ? '#0a1628' : '#ef4444'} highlight={!user?.phone} />
          <InfoTile icon="fiber_manual_record" label="Status" value={user?.status || 'active'} valueColor={user?.status === 'active' ? '#15803d' : '#94a3b8'} />
        </div>

        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 24px' }} />

        <SectionTitle icon="location_on" label="Delivery Address" />
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 24 }}>
          <span className="material-symbols-outlined" style={{ color: '#94a3b8', fontSize: 18, marginTop: 2, flexShrink: 0 }}>home</span>
          <p style={{ fontSize: 13, color: user?.address ? '#334155' : '#94a3b8', lineHeight: 1.5 }}>{user?.address || 'No address on file'}</p>
        </div>

        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 24px' }} />

        <SectionTitle icon="business" label="Logistics Provider" />
        <div style={{ background: '#0a1628', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,.1)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 22 }}>package_2</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{tenant?.company_name || 'LogistiHub'}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', fontFamily: "'DM Mono', monospace", marginTop: 2 }}>{tenant?.business_type || 'Logistics'} · /{tenant?.slug || slug}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 99, ...planStyle }}>{(tenant?.plan || 'STARTUP').toUpperCase()}</span>
        </div>

        {user?.created_at && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94a3b8', marginBottom: 28 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>schedule</span>
            Member since {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}

        <button className="btn btn-danger" onClick={() => setShowLogoutModal(true)} style={{ gap: 8 }}>
          <span className="material-symbols-outlined">logout</span>
          Sign Out
        </button>
      </div>

      {/* ── Edit Profile Bottom Sheet ───────────────────────────────────────── */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, animation: 'fadeIn .2s ease' }}
          onClick={e => { if (e.target === e.currentTarget) setShowEdit(false); }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430, animation: 'fadeUp .25s ease' }}>
            <div style={{ width: 36, height: 4, borderRadius: 99, background: '#e2e8f0', margin: '0 auto 20px' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#3b82f6' }}>manage_accounts</span>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0a1628' }}>Edit Profile</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>Update your personal information</div>
              </div>
            </div>

            {saveErr && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#dc2626' }}>error</span>
                <span style={{ fontSize: 12, color: '#dc2626' }}>{saveErr}</span>
              </div>
            )}
            {saveOk && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#16a34a' }}>check_circle</span>
                <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>Profile updated!</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <EditField label="First Name" icon="person" value={editForm.first_name} onChange={v => setEditForm(f => ({ ...f, first_name: v }))} placeholder="Juan" />
              <EditField label="Last Name"  icon="person" value={editForm.last_name}  onChange={v => setEditForm(f => ({ ...f, last_name: v }))}  placeholder="dela Cruz" />
            </div>
            <EditField label="Phone Number *" icon="phone" type="tel" value={editForm.phone} onChange={v => setEditForm(f => ({ ...f, phone: v }))} placeholder="+63 9XX XXX XXXX" required />

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setShowEdit(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={doSave} disabled={saving}>
                {saving
                  ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Saving…</>
                  : <><span className="material-symbols-outlined">save</span> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout modal ───────────────────────────────────────────────────── */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, animation: 'fadeIn .2s ease' }}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px 40px', width: '100%', maxWidth: 430, animation: 'fadeUp .25s ease' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <span className="material-symbols-outlined" style={{ color: '#dc2626', fontSize: 24 }}>logout</span>
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0a1628', marginBottom: 6 }}>Sign out?</h3>
            <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>You'll be signed out of <strong>{tenant?.company_name || slug}</strong> on this device.</p>
            <button className="btn btn-danger" onClick={doLogout} disabled={loggingOut} style={{ marginBottom: 10 }}>
              {loggingOut ? <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span> Signing out…</> : <><span className="material-symbols-outlined">logout</span> Yes, Sign Out</>}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowLogoutModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8' }}>{icon}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</span>
    </div>
  );
}

function InfoTile({ icon, label, value, full, valueColor, highlight }: {
  icon: string; label: string; value: string; full?: boolean; valueColor?: string; highlight?: boolean;
}) {
  return (
    <div style={{ gridColumn: full ? '1 / -1' : undefined, background: highlight ? '#fff5f5' : '#f8fafc', border: `1px solid ${highlight ? '#fecaca' : '#e2e8f0'}`, borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 13, color: highlight ? '#ef4444' : '#94a3b8' }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: highlight ? '#ef4444' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: valueColor || '#0a1628', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function EditField({ label, icon, type = 'text', value, onChange, placeholder, required }: {
  label: string; icon: string; type?: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: 17, pointerEvents: 'none' }}>{icon}</span>
        <input type={type} placeholder={placeholder} value={value} required={required} onChange={e => onChange(e.target.value)} style={{ paddingLeft: 40 }} />
      </div>
    </div>
  );
}
