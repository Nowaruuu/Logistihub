import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Truck, Save, AlertCircle, CheckCircle, Loader2, ChevronRight, ShieldAlert, Clock, XCircle, Camera } from 'lucide-react';
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

const VEHICLE_TYPES = ['Motorcycle', 'Sedan', 'Van', 'Truck', 'Flatbed', 'L300', 'Elf Truck'];

export default function VehicleInfo() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null); // base64 data URL
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [capacityKg, setCapacityKg] = useState('');
  const [licenseStatus, setLicenseStatus] = useState<string>('not_uploaded');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(mobileUrl('/driver/vehicle'), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.vehicle_plate) setVehiclePlate(d.vehicle_plate);
        if (d.vehicle_type)  setVehicleType(d.vehicle_type);
        if (d.model)         setVehicleModel(d.model);
        if (d.license_status) setLicenseStatus(d.license_status);
        if (d.image_url)     setExistingPhotoUrl(d.image_url);
        if (d.capacity_tons) setCapacityKg(String(Math.round(parseFloat(d.capacity_tons) * 1000)));
      })
      .catch(() => { /* no vehicle yet */ })
      .finally(() => setLoading(false));
  }, []);

  // Compress and set vehicle photo from file input
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round((h * MAX) / w); w = MAX; }
        if (h > MAX) { w = Math.round((w * MAX) / h); h = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        setVehiclePhoto(canvas.toDataURL('image/jpeg', 0.75));
        setError('');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!vehiclePlate.trim()) { setError('Please enter your plate number.'); return; }
    if (!vehicleType)         { setError('Please select a vehicle type.'); return; }
    if (!vehiclePhoto && !existingPhotoUrl) {
      setError('A photo of your vehicle is required. Please take or upload a photo.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(mobileUrl('/driver/vehicle'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({
          vehicle_plate: vehiclePlate,
          vehicle_type: vehicleType,
          model: vehicleModel || null,
          vehicle_photo: vehiclePhoto || undefined,
          capacity_kg: capacityKg ? parseFloat(capacityKg) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');

      // Re-fetch to confirm server saved it
      const verify = await fetch(mobileUrl('/driver/vehicle'), { headers: authHeaders() });
      if (verify.ok) {
        const saved = await verify.json();
        if (saved.vehicle_plate) setVehiclePlate(saved.vehicle_plate);
        if (saved.vehicle_type)  setVehicleType(saved.vehicle_type);
        if (saved.model)         setVehicleModel(saved.model);
        if (saved.image_url)     setExistingPhotoUrl(saved.image_url);
      }

      setSuccess(true);
      setTimeout(() => { setSuccess(false); navigate(-1); }, 1800);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Make sure the server is running the latest version.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-orange-600" />
      </div>
    );
  }

  // ── License gate ────────────────────────────────────────────────────────
  if (licenseStatus !== 'verified') {
    const configs: Record<string, { icon: any; color: string; bg: string; title: string; msg: string }> = {
      not_uploaded: {
        icon: ShieldAlert, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30',
        title: 'License Required',
        msg: 'You must upload your driver\'s license before you can register or request a vehicle. Go to Documents to upload it.',
      },
      pending_review: {
        icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30',
        title: 'License Under Review',
        msg: 'Your license has been submitted and is waiting for admin approval. You\'ll be able to register a vehicle once it\'s verified.',
      },
      expired: {
        icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30',
        title: 'License Expired',
        msg: 'Your driver\'s license has expired. Please upload a renewed license and wait for admin verification.',
      },
    };
    const cfg = configs[licenseStatus] || configs.not_uploaded;
    const Icon = cfg.icon;
    return (
      <div className="pb-28 space-y-5">
        <div className="flex items-center gap-4 px-5 pt-4">
          <button onClick={() => navigate(-1)} className="size-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm">
            <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Vehicle Information</h1>
            <p className="text-xs text-slate-500">License verification required</p>
          </div>
        </div>
        <div className={cn('mx-5 rounded-2xl border p-5 space-y-4', cfg.bg)}>
          <div className="flex items-center gap-3">
            <Icon className={cn('size-8 flex-shrink-0', cfg.color)} />
            <div>
              <p className={cn('font-extrabold text-base', cfg.color)}>{cfg.title}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">{cfg.msg}</p>
            </div>
          </div>
          {licenseStatus === 'not_uploaded' || licenseStatus === 'expired' ? (
            <button
              onClick={() => navigate('/driver/documents')}
              className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <ShieldAlert className="size-4" />
              Go to Documents → Upload License
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // Current photo to display (newly captured takes priority over existing)
  const displayPhoto = vehiclePhoto || existingPhotoUrl;

  return (
    <div className="pb-28 space-y-5">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center gap-4 px-5 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="size-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm"
        >
          <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">Vehicle Information</h1>
          <p className="text-xs text-slate-500">Your vehicle is auto-assigned when you accept jobs</p>
        </div>
      </div>

      {/* Vehicle Photo — REQUIRED */}
      <div className="mx-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            Vehicle Photo <span className="text-red-500">*</span>
          </label>
          {displayPhoto && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-[10px] font-bold text-orange-600 flex items-center gap-1"
            >
              <Camera className="size-3" /> Retake
            </button>
          )}
        </div>

        {displayPhoto ? (
          <div className="relative rounded-2xl overflow-hidden border-2 border-orange-500 shadow-lg shadow-orange-500/10">
            <img
              src={displayPhoto}
              alt="Vehicle"
              className="w-full h-48 object-cover"
            />
            {vehiclePhoto && (
              <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="size-3" /> New Photo
              </div>
            )}
            {!vehiclePhoto && existingPhotoUrl && (
              <div className="absolute top-2 right-2 bg-slate-800/70 backdrop-blur text-white text-[10px] font-black px-2.5 py-1 rounded-full">
                Existing
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-48 border-2 border-dashed border-red-300 dark:border-red-800/60 rounded-2xl flex flex-col items-center justify-center gap-3 bg-red-50 dark:bg-red-950/10 active:bg-red-100 dark:active:bg-red-950/20 transition-colors"
          >
            <div className="size-16 rounded-full bg-orange-600/10 flex items-center justify-center">
              <Camera className="size-8 text-orange-500" />
            </div>
            <div className="text-center">
              <p className="text-slate-900 dark:text-white font-bold text-sm">Take Vehicle Photo</p>
              <p className="text-red-500 text-xs mt-0.5 font-semibold">Required — tap to capture</p>
            </div>
          </button>
        )}
      </div>

      {/* Card */}
      <div className="mx-5 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Icon header */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          <div className="size-14 rounded-2xl bg-orange-600 flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
            <Truck className="size-7" />
          </div>
          <div>
            <p className="font-extrabold text-slate-900 dark:text-white text-base">
              {vehiclePlate || 'No Vehicle Set'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {vehicleType || 'Select type below'}
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Plate number */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Plate Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
              placeholder="e.g. ABC-1234"
              className="w-full h-13 px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-mono font-bold text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-600/30 focus:border-orange-600 transition-all uppercase"
            />
          </div>

          {/* Vehicle type grid */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Vehicle Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_TYPES.map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVehicleType(type)}
                  className={cn(
                    'py-3 px-2 rounded-xl text-xs font-bold border transition-all active:scale-95',
                    vehicleType === type
                      ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-600/25'
                      : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-orange-600/50'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Model (optional) */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Model / Description <span className="text-slate-400 font-normal normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={vehicleModel}
              onChange={e => setVehicleModel(e.target.value)}
              placeholder="e.g. Toyota Hi-Ace 2021"
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-600/30 focus:border-orange-600 transition-all"
            />
          </div>

          {/* Max Weight Capacity */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Max Weight Capacity <span className="text-slate-400 font-normal normal-case">(kg)</span>
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                value={capacityKg}
                onChange={e => setCapacityKg(e.target.value)}
                placeholder="e.g. 500"
                className="w-full px-4 py-3.5 pr-14 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-orange-600/30 focus:border-orange-600 transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">kg</span>
            </div>
            {capacityKg && parseFloat(capacityKg) > 0 && (
              <p className="text-[11px] text-slate-400 mt-1.5 px-1">
                = {(parseFloat(capacityKg) / 1000).toFixed(2)} tons
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Notice */}
      <div className="mx-5 flex gap-3 p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
        <AlertCircle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-orange-800 dark:text-orange-400/80 leading-relaxed">
          Your plate number and vehicle photo will be visible to admin and appear in shipment records when you accept a delivery job.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 flex gap-2 items-center p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30">
          <AlertCircle className="size-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mx-5 flex gap-2 items-center p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30">
          <CheckCircle className="size-4 text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400 font-bold">Vehicle info saved!</p>
        </div>
      )}

      {/* Save button */}
      <div className="mx-5">
        <button
          onClick={handleSave}
          disabled={saving || (!vehiclePhoto && !existingPhotoUrl)}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-extrabold text-[15px] shadow-xl active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 className="size-5 animate-spin" />Saving…</>
          ) : (
            <><Save className="size-5" />Save Vehicle Details</>
          )}
        </button>
        {!vehiclePhoto && !existingPhotoUrl && (
          <p className="text-center text-xs text-red-500 font-semibold mt-2">Vehicle photo required to save</p>
        )}
      </div>

      {/* Request fleet vehicle */}
      <div className="mx-5">
        <button
          onClick={() => navigate('/driver/vehicle-request')}
          className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-sm active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
              <Truck className="size-4 text-orange-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-slate-900 dark:text-white">Don't own a vehicle?</p>
              <p className="text-xs text-slate-400">Request a fleet vehicle from admin</p>
            </div>
          </div>
          <ChevronRight className="size-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
