import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Upload, CheckCircle, Clock, XCircle, AlertTriangle, Camera, FileText, ShieldCheck, CalendarDays, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE = 'https://logistichub.ddns.net';

function mobileUrl(path: string) {
  const slug = localStorage.getItem('auth_slug') || '';
  return `${API_BASE}/${slug}/api/mobile${path}`;
}
function authHeaders() {
  const token = localStorage.getItem('auth_token') || '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

type LicenseStatus = 'not_uploaded' | 'pending_review' | 'verified' | 'expired';

const STATUS_CONFIG: Record<LicenseStatus, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  not_uploaded:   { label: 'Not Uploaded',    color: 'text-slate-500',  icon: AlertTriangle, bg: 'bg-slate-100 dark:bg-slate-800' },
  pending_review: { label: 'Under Review',    color: 'text-amber-600',  icon: Clock,         bg: 'bg-amber-50 dark:bg-amber-900/20' },
  verified:       { label: 'Verified',         color: 'text-green-600',  icon: CheckCircle,   bg: 'bg-green-50 dark:bg-green-900/20' },
  expired:        { label: 'Expired',          color: 'text-red-500',    icon: XCircle,       bg: 'bg-red-50 dark:bg-red-900/20' },
};

export default function DriverDocuments() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('not_uploaded');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState('');
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(mobileUrl('/driver/documents'), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        setLicenseUrl(d.license_url || null);
        setLicenseStatus((d.license_status as LicenseStatus) || 'not_uploaded');
        if (d.license_expiry) {
          setLicenseExpiry(d.license_expiry.split('T')[0]);
          setNewExpiry(d.license_expiry.split('T')[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
    setError('');
  };

  const handleSubmit = async () => {
    if (!previewImage && !licenseUrl) {
      setError('Please select a license photo first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(mobileUrl('/driver/documents'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          license_image: previewImage || licenseUrl,
          license_expiry: newExpiry || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Upload failed');
      }
      setLicenseStatus('pending_review');
      if (previewImage) setLicenseUrl(previewImage);
      if (newExpiry) setLicenseExpiry(newExpiry);
      setPreviewImage(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to upload license.');
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-white dark:bg-slate-900">
      <Loader2 className="size-8 text-orange-600 animate-spin" />
    </div>
  );

  const statusCfg = STATUS_CONFIG[licenseStatus];
  const StatusIcon = statusCfg.icon;
  const displayImage = previewImage || licenseUrl;

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-12 pb-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 active:scale-95 transition-all">
          <ArrowLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Driver Documents</h1>
          <p className="text-xs text-slate-400 mt-0.5">Upload and manage your credentials</p>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-4 pb-32">

        {/* Status Banner */}
        <div className={cn('flex items-center gap-3 p-4 rounded-2xl border', statusCfg.bg,
          licenseStatus === 'verified' ? 'border-green-200 dark:border-green-800/30' :
          licenseStatus === 'pending_review' ? 'border-amber-200 dark:border-amber-800/30' :
          licenseStatus === 'expired' ? 'border-red-200 dark:border-red-800/30' :
          'border-slate-200 dark:border-slate-700'
        )}>
          <StatusIcon className={cn('size-6 flex-shrink-0', statusCfg.color)} />
          <div>
            <p className={cn('font-bold text-sm', statusCfg.color)}>{statusCfg.label}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {licenseStatus === 'not_uploaded' && 'Upload your driver\'s license to start accepting jobs'}
              {licenseStatus === 'pending_review' && 'Your license is being reviewed by the admin'}
              {licenseStatus === 'verified' && `Valid until ${licenseExpiry || 'N/A'} · You can accept delivery jobs`}
              {licenseStatus === 'expired' && 'Your license has expired — please upload a renewed one'}
            </p>
          </div>
        </div>

        {/* Success toast */}
        {success && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
            <ShieldCheck className="size-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-bold text-green-700 dark:text-green-400">License submitted for review!</p>
          </div>
        )}

        {/* License Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <FileText className="size-4 text-blue-500" />
            <span className="font-bold text-sm text-slate-900 dark:text-white">Driver's License</span>
          </div>

          {/* Image area */}
          <div
            onClick={() => fileRef.current?.click()}
            className={cn(
              'relative mx-4 my-4 rounded-xl overflow-hidden border-2 border-dashed cursor-pointer transition-all',
              'min-h-[180px] flex items-center justify-center',
              displayImage
                ? 'border-blue-300 dark:border-blue-700'
                : 'border-slate-200 dark:border-slate-700 hover:border-blue-400'
            )}
          >
            {displayImage ? (
              <>
                <img src={displayImage} alt="License" className="w-full h-48 object-cover" />
                {previewImage && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <span className="text-white text-xs font-bold bg-black/50 px-3 py-1 rounded-full">New photo selected · Tap to change</span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-8 px-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Camera className="size-7 text-blue-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">Tap to upload license photo</p>
                  <p className="text-xs text-slate-400 mt-1">Take a photo or choose from gallery · Max 5MB</p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Expiry date */}
          <div className="px-4 pb-4">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              <CalendarDays className="size-3 inline mr-1" />
              License Expiry Date
            </label>
            <input
              type="date"
              value={newExpiry}
              onChange={e => setNewExpiry(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Info box */}
        <div className="flex gap-3 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
          <ShieldCheck className="size-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <p className="font-bold text-blue-700 dark:text-blue-400">How it works</p>
            <p>1. Take a clear photo of your driver's license (front side)</p>
            <p>2. Set the expiry date printed on your license</p>
            <p>3. Submit — admin will verify within 24 hours</p>
            <p>4. Once verified, you can start accepting delivery jobs</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
            <AlertTriangle className="size-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Submit button */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={handleSubmit}
          disabled={saving || (!previewImage && licenseStatus === 'pending_review')}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-blue-600 text-white font-bold text-[15px] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-blue-600/20"
        >
          {saving ? (
            <><Loader2 className="size-5 animate-spin" /> Submitting...</>
          ) : (
            <><Upload className="size-5" /> {licenseUrl ? 'Update License' : 'Submit License'}</>
          )}
        </button>
        {licenseStatus === 'pending_review' && !previewImage && (
          <p className="text-center text-xs text-slate-400 mt-2">Upload a new photo to resubmit</p>
        )}
      </div>
    </div>
  );
}
