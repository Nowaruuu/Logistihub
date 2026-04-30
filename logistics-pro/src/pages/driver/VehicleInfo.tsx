import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Truck, Save, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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

  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
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
      })
      .catch(() => { /* no vehicle set yet, show empty form */ })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!vehiclePlate.trim()) { setError('Please enter your plate number.'); return; }
    if (!vehicleType)         { setError('Please select a vehicle type.'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(mobileUrl('/driver/vehicle'), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ vehicle_plate: vehiclePlate, vehicle_type: vehicleType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');

      // Immediately re-fetch to confirm the server actually saved it
      const verify = await fetch(mobileUrl('/driver/vehicle'), { headers: authHeaders() });
      if (verify.ok) {
        const saved = await verify.json();
        if (saved.vehicle_plate) setVehiclePlate(saved.vehicle_plate);
        if (saved.vehicle_type)  setVehicleType(saved.vehicle_type);
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

  return (
    <div className="pb-28 space-y-5">
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
              Plate Number
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
              Vehicle Type
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

          {/* Model (optional, local only) */}
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
        </div>
      </div>

      {/* Notice */}
      <div className="mx-5 flex gap-3 p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
        <AlertCircle className="size-5 text-orange-600 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-orange-800 dark:text-orange-400/80 leading-relaxed">
          Your plate number will automatically appear in the shipment record when you accept a delivery job.
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
          disabled={saving}
          className="w-full flex items-center justify-center gap-2.5 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-extrabold text-[15px] shadow-xl active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {saving ? (
            <><Loader2 className="size-5 animate-spin" />Saving…</>
          ) : (
            <><Save className="size-5" />Save Vehicle Details</>
          )}
        </button>
      </div>
    </div>
  );
}
