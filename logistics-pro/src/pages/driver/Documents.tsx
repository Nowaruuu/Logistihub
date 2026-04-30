import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, CheckCircle, Clock, XCircle, AlertTriangle,
  Camera, FileText, ShieldCheck, CalendarDays, Loader2, Car, Save
} from 'lucide-react';
import { cn } from '../../lib/utils';

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
  not_uploaded:   { label: 'Not Uploaded',  color: 'text-slate-500',  icon: AlertTriangle, bg: 'bg-slate-100 dark:bg-slate-800' },
  pending_review: { label: 'Under Review',  color: 'text-amber-600',  icon: Clock,         bg: 'bg-amber-50 dark:bg-amber-900/20' },
  verified:       { label: 'Verified',      color: 'text-green-600',  icon: CheckCircle,   bg: 'bg-green-50 dark:bg-green-900/20' },
  expired:        { label: 'Expired',       color: 'text-red-500',    icon: XCircle,       bg: 'bg-red-50 dark:bg-red-900/20' },
};

const VEHICLE_TYPES = ['Motorcycle', 'Sedan', 'Van', 'Truck', 'Flatbed', 'L300', 'Elf Truck'];

export default function Documents() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // License state
  const [licenseUrl, setLicenseUrl] = useState<string | null>(null);
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('not_uploaded');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newExpiry, setNewExpiry] = useState('');
  const [licenseSuccess, setLicenseSuccess] = useState(false);
  const [licenseError, setLicenseError] = useState('');

  // Vehicle state
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleSuccess, setVehicleSuccess] = useState(false);
  const [vehicleError, setVehicleError] = useState('');

  useEffect(() => {
    // Load license info
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

    // Load vehicle info
    fetch(mobileUrl('/driver/vehicle'), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.vehicle_plate) setVehiclePlate(d.vehicle_plate);
        if (d.vehicle_type) setVehicleType(d.vehicle_type);
      })
      .catch(() => {});
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setPreviewImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleLicenseSubmit = async () => {
    if (!previewImage && !licenseUrl) {
      setLicenseError('Please take or upload a photo of your license first.');
      return;
    }
    if (!newExpiry) {
      setLicenseError('Please enter your license expiry date.');
      return;
    }
    setSaving(true);
    setLicenseError('');
    try {
      const res = await fetch(mobileUrl('/driver/documents'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          license_image: previewImage || licenseUrl,
          license_expiry: newExpiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit.');
      setLicenseStatus('pending_review');
      setLicenseSuccess(true);
      setTimeout(() => setLicenseSuccess(false), 3000);
    } catch (err: any) {
      setLicenseError(err.message || 'Submission failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleVehicleSave = async () => {
    if (!vehiclePlate.trim() || !vehicleType) {
      setVehicleError('Please enter your plate number and select a vehicle type.');
      return;
    }
    setVehicleSaving(true);
    setVehicleError('');
    try {
      const res = await fetch(mobileUrl('/driver/vehicle'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ vehicle_plate: vehiclePlate, vehicle_type: vehicleType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');
      setVehicleSuccess(true);
      setTimeout(() => setVehicleSuccess(false), 3000);
    } catch (err: any) {
      setVehicleError(err.message || 'Save failed.');
    } finally {
      setVehicleSaving(false);
    }
  };

  const statusCfg = STATUS_CONFIG[licenseStatus];
  const StatusIcon = statusCfg.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="size-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-4">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="size-5 text-slate-700 dark:text-slate-300" />
        </button>
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Driver Documents</h2>
          <p className="text-xs text-slate-500">License & vehicle information</p>
        </div>
      </div>

      {/* ── VEHICLE INFO ── */}
      <div className="px-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
            <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <Car className="size-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Your Vehicle</h3>
              <p className="text-xs text-slate-500">This is auto-assigned when you accept jobs</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Plate number */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Plate Number
              </label>
              <input
                type="text"
                value={vehiclePlate}
                onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                placeholder="e.g. ABC-1234"
                className="w-full h-12 px-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-mono font-bold text-base focus:outline-none focus:ring-2 focus:ring-orange-600/30 focus:border-orange-600 uppercase"
              />
            </div>

            {/* Vehicle type */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Vehicle Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {VEHICLE_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVehicleType(type)}
                    className={cn(
                      'py-2.5 px-2 rounded-xl text-xs font-bold border transition-all',
                      vehicleType === type
                        ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/20'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {vehicleError && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />{vehicleError}
              </p>
            )}
            {vehicleSuccess && (
              <p className="text-xs text-green-600 font-bold flex items-center gap-1.5">
                <CheckCircle className="size-3.5" />Vehicle info saved!
              </p>
            )}

            <button
              onClick={handleVehicleSave}
              disabled={vehicleSaving}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {vehicleSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {vehicleSaving ? 'Saving...' : 'Save Vehicle Info'}
            </button>
          </div>
        </div>
      </div>

      {/* ── DRIVER'S LICENSE ── */}
      <div className="px-5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
          {/* Status header */}
          <div className={cn('flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700', statusCfg.bg)}>
            <StatusIcon className={cn('size-5', statusCfg.color)} />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Driver's License</h3>
              <p className={cn('text-xs font-bold', statusCfg.color)}>{statusCfg.label}</p>
            </div>
            {licenseExpiry && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
                <CalendarDays className="size-3.5" />
                Expires {new Date(licenseExpiry).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>

          <div className="p-5 space-y-4">
            {/* Current license preview */}
            {(previewImage || licenseUrl) && (
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
                <img
                  src={previewImage || licenseUrl!}
                  alt="License"
                  className="w-full object-cover max-h-48"
                />
              </div>
            )}

            {/* Upload / Camera */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { if (fileRef.current) { fileRef.current.capture = 'environment'; fileRef.current.click(); }}}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-orange-600 transition-colors group"
              >
                <Camera className="size-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
                <span className="text-xs font-bold text-slate-500 group-hover:text-orange-600">Take Photo</span>
              </button>
              <button
                onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute('capture'); fileRef.current.click(); }}}
                className="flex flex-col items-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-600 hover:border-orange-600 transition-colors group"
              >
                <Upload className="size-5 text-slate-400 group-hover:text-orange-600 transition-colors" />
                <span className="text-xs font-bold text-slate-500 group-hover:text-orange-600">Upload File</span>
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />

            {/* Expiry date */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                License Expiry Date
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <input
                  type="date"
                  value={newExpiry}
                  onChange={e => setNewExpiry(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-600/30 focus:border-orange-600"
                />
              </div>
            </div>

            {licenseError && (
              <p className="text-xs text-red-500 font-medium flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />{licenseError}
              </p>
            )}
            {licenseSuccess && (
              <p className="text-xs text-green-600 font-bold flex items-center gap-1.5">
                <ShieldCheck className="size-3.5" />License submitted for review!
              </p>
            )}

            <button
              onClick={handleLicenseSubmit}
              disabled={saving || licenseStatus === 'verified'}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3.5 font-bold rounded-xl transition-all active:scale-[0.98]',
                licenseStatus === 'verified'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 cursor-default'
                  : 'bg-orange-600 text-white shadow-lg shadow-orange-600/20 hover:brightness-110 disabled:opacity-50'
              )}
            >
              {saving ? (
                <><Loader2 className="size-4 animate-spin" />Submitting...</>
              ) : licenseStatus === 'verified' ? (
                <><CheckCircle className="size-4" />License Verified</>
              ) : (
                <><FileText className="size-4" />{licenseUrl ? 'Update License' : 'Submit for Review'}</>
              )}
            </button>

            {licenseStatus === 'pending_review' && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                <Clock className="size-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Your license is being reviewed by your manager. You'll be notified once verified.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
