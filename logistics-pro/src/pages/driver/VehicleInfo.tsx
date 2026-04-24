import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { ChevronLeft, Truck, Save, AlertCircle } from 'lucide-react';
import { Driver } from '../../types';
import { cn } from '../../lib/utils';

export default function VehicleInfo() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vehicleType: 'Van' as Driver['vehicleType'],
    vehicleModel: '',
    plateNumber: '',
    status: 'Available' as Driver['status']
  });

  useEffect(() => {
    if (profile?.uid) {
      fetchDriver();
    }
  }, [profile]);

  const fetchDriver = async () => {
    try {
      const data = await userService.getDriver(profile!.uid);
      if (data) {
        setDriver(data);
        setForm({
          vehicleType: data.vehicleType || 'Van',
          vehicleModel: data.vehicleModel || '',
          plateNumber: data.plateNumber || '',
          status: data.status || 'Available'
        });
      }
    } catch (err) {
      console.error("Error fetching driver:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await userService.saveDriver(profile.uid, {
        ...driver,
        ...form,
        updatedAt: new Date().toISOString()
      });
      navigate('/profile');
    } catch (err) {
      console.error("Error saving vehicle info:", err);
      alert('Failed to save vehicle information.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="size-8 border-4 border-orange-600/30 border-t-orange-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Vehicle Information</h1>
      </div>

      <div className="px-6 max-w-lg mx-auto space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="size-16 rounded-2xl bg-orange-600 flex items-center justify-center text-white">
              <Truck className="size-8" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn(
                  "size-2 rounded-full",
                  form.status === 'Available' ? "bg-emerald-500" : 
                  form.status === 'On Delivery' ? "bg-orange-500" : "bg-slate-400"
                )} />
                <span className="text-slate-900 dark:text-white font-bold">{form.status}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">Vehicle Type</label>
              <div className="grid grid-cols-2 gap-2">
                {['Van', 'Truck', 'Motorcycle', 'Bicycle'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setForm({ ...form, vehicleType: type as any })}
                    className={cn(
                      "p-3 rounded-xl border font-bold text-sm transition-all",
                      form.vehicleType === type 
                        ? "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20" 
                        : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-400"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">Vehicle Model</label>
              <input 
                type="text"
                value={form.vehicleModel}
                onChange={(e) => setForm({ ...form, vehicleModel: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="e.g. Ford Transit 2021"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">Plate Number</label>
              <input 
                type="text"
                value={form.plateNumber}
                onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-4 text-slate-900 dark:text-white font-mono font-bold tracking-widest focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="e.g. ABC1234"
              />
            </div>
          </div>
        </div>

        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-2xl p-4 border border-orange-100 dark:border-orange-900/30 flex gap-3">
          <AlertCircle className="size-5 text-orange-600 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-900/70 dark:text-orange-400/70 leading-relaxed">
            Changes to vehicle information may require re-verification by our administrative team.
          </p>
        </div>

        <button 
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl py-4 font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            <div className="size-5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin"></div>
          ) : (
            <>
              <Save className="size-5" />
              Save Vehicle Details
            </>
          )}
        </button>
      </div>
    </div>
  );
}
