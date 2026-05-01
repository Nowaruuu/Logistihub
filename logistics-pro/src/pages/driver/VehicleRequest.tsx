import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, Truck, CheckCircle, XCircle, Clock,
  AlertTriangle, Loader2, MessageSquare, ChevronRight,
  ShieldAlert
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

interface FleetVehicle {
  plate_number: string;
  vehicle_type: string;
  model?: string;
  capacity_tons?: number;
  supported_item_types?: string;
}

interface VehicleRequest {
  id: number;
  vehicle_plate: string;
  request_type: 'driver_request' | 'staff_assignment';
  status: 'pending' | 'approved' | 'denied' | 'refused';
  refusal_reason?: string;
  vehicle_type: string;
  model?: string;
  capacity_tons?: number;
  supported_item_types?: string;
  created_at: string;
}

type View = 'list' | 'browse' | 'refuse';

export default function VehicleRequestPage() {
  const navigate = useNavigate();
  const [view, setView]                 = useState<View>('list');
  const [requests, setRequests]         = useState<VehicleRequest[]>([]);
  const [fleet, setFleet]               = useState<FleetVehicle[]>([]);
  const [licenseStatus, setLicenseStatus] = useState<string>('not_uploaded');
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState('');
  const [success, setSuccess]           = useState('');
  const [refuseTarget, setRefuseTarget] = useState<VehicleRequest | null>(null);
  const [refuseReason, setRefuseReason] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [reqRes, fleetRes, vehicleRes] = await Promise.all([
        fetch(mobileUrl('/driver/vehicle-requests'), { headers: authHeaders() }),
        fetch(mobileUrl('/driver/fleet-vehicles'),   { headers: authHeaders() }),
        fetch(mobileUrl('/driver/vehicle'),           { headers: authHeaders() }),
      ]);
      const reqData     = await reqRes.json();
      const fleetData   = await fleetRes.json();
      const vehicleData = await vehicleRes.json();
      setRequests(reqData.requests || []);
      setFleet(fleetData.vehicles || []);
      if (vehicleData.license_status) setLicenseStatus(vehicleData.license_status);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const requestVehicle = async (plate: string) => {
    setError(''); setSubmitting(true);
    try {
      const r = await fetch(mobileUrl('/driver/vehicle-request'), {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ vehicle_plate: plate }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setSuccess('Request submitted! Waiting for admin approval.');
      setView('list'); fetchAll();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const respond = async (id: number, action: 'accept' | 'refuse', reason?: string) => {
    setSubmitting(true); setError('');
    try {
      const r = await fetch(mobileUrl(`/driver/vehicle-request/${id}/respond`), {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ action, reason }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setSuccess(action === 'accept' ? '✓ Vehicle accepted and assigned to you!' : 'Assignment refused.');
      setRefuseTarget(null); setRefuseReason(''); setView('list'); fetchAll();
    } catch (e: any) { setError(e.message); }
    finally { setSubmitting(false); }
  };

  const statusConfig = {
    pending:  { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20',  icon: Clock,       label: 'Pending'  },
    approved: { color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/20',  icon: CheckCircle, label: 'Approved' },
    denied:   { color: 'text-red-600',   bg: 'bg-red-50 dark:bg-red-900/20',      icon: XCircle,     label: 'Denied'   },
    refused:  { color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800',    icon: XCircle,     label: 'Refused'  },
  };

  const pendingAssignment = requests.find(r => r.request_type === 'staff_assignment' && r.status === 'pending');

  // ── Shared header ─────────────────────────────────────────────────────────
  const Header = () => (
    <div className="flex items-center gap-3 px-4 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10">
      <button onClick={() => view !== 'list' ? setView('list') : navigate(-1)} className="size-9 rounded-full flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
        <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
      </button>
      <div className="flex-1">
        <h1 className="text-base font-extrabold text-slate-900 dark:text-white">
          {view === 'browse' ? 'Browse Fleet Vehicles' : view === 'refuse' ? 'Refuse Assignment' : 'Vehicle Requests'}
        </h1>
        <p className="text-xs text-slate-400">Request or manage vehicle assignments</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <Header />
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-8 animate-spin text-orange-600" />
      </div>
    </div>
  );

  // ── License gate ───────────────────────────────────────────────────────────
  if (licenseStatus !== 'verified') {
    const isPending = licenseStatus === 'pending_review';
    const isExpired = licenseStatus === 'expired';
    return (
      <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-24">
        <Header />
        <div className="p-4 mt-2">
          <div className={cn(
            'rounded-2xl border p-5 space-y-4',
            isPending
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/30'
          )}>
            <div className="flex items-start gap-3">
              {isPending
                ? <Clock className="size-8 text-amber-600 flex-shrink-0 mt-0.5" />
                : <ShieldAlert className="size-8 text-red-500 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={cn('font-extrabold text-base', isPending ? 'text-amber-600' : 'text-red-500')}>
                  {isPending ? 'License Under Review' : isExpired ? 'License Expired' : 'License Required'}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {isPending
                    ? 'Your license is being reviewed by admin. Once approved you can request a fleet vehicle.'
                    : isExpired
                    ? 'Your driver\'s license has expired. Please upload a renewed one and wait for verification.'
                    : 'You must upload your driver\'s license and have it verified before requesting a fleet vehicle.'
                  }
                </p>
              </div>
            </div>
            {!isPending && (
              <button
                onClick={() => navigate('/driver/documents')}
                className="w-full py-3 bg-orange-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <ShieldAlert className="size-4" />
                Go to Documents → Upload License
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Main content ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950 pb-24">
      <Header />

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="p-4 space-y-4">
          {pendingAssignment && (
            <div className="bg-orange-600 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="size-4" />
                <span className="text-xs font-black uppercase tracking-wider">Vehicle Offer</span>
              </div>
              <p className="font-extrabold text-lg">{pendingAssignment.vehicle_plate}</p>
              <p className="text-white/80 text-sm">{pendingAssignment.vehicle_type}{pendingAssignment.model ? ` · ${pendingAssignment.model}` : ''}</p>
              {pendingAssignment.capacity_tons && <p className="text-white/70 text-xs mt-0.5">{pendingAssignment.capacity_tons} tons capacity</p>}
              {pendingAssignment.supported_item_types && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {pendingAssignment.supported_item_types.split(',').map(t => (
                    <span key={t} className="text-[9px] font-bold bg-white/20 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              )}
              <p className="text-white/70 text-xs mt-3">Admin has assigned this vehicle to you. Do you accept?</p>
              <div className="flex gap-3 mt-4">
                <button onClick={() => respond(pendingAssignment.id, 'accept')} disabled={submitting} className="flex-1 py-2.5 bg-white text-orange-600 font-extrabold rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50">
                  {submitting ? <Loader2 className="size-4 animate-spin mx-auto" /> : '✓ Accept'}
                </button>
                <button onClick={() => { setRefuseTarget(pendingAssignment); setView('refuse'); }} disabled={submitting} className="flex-1 py-2.5 bg-white/20 text-white font-extrabold rounded-xl text-sm active:scale-95 transition-all border border-white/30">
                  ✕ Refuse
                </button>
              </div>
            </div>
          )}

          <button onClick={() => setView('browse')} className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                <Truck className="size-5 text-orange-600" />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-900 dark:text-white text-sm">Request a Fleet Vehicle</p>
                <p className="text-xs text-slate-400">{fleet.length} available vehicle{fleet.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-slate-400" />
          </button>

          {requests.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 dark:border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Request History</p>
              </div>
              {requests.map(req => {
                const cfg  = statusConfig[req.status];
                const Icon = cfg.icon;
                return (
                  <div key={req.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 dark:border-slate-800 last:border-0">
                    <div className={cn('size-9 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
                      <Icon className={cn('size-4', cfg.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-slate-900 dark:text-white font-mono">{req.vehicle_plate}</p>
                        <span className={cn('text-[9px] font-black uppercase px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-slate-400">{req.vehicle_type}{req.model ? ` · ${req.model}` : ''} · {req.request_type === 'staff_assignment' ? 'Staff assigned' : 'Your request'}</p>
                      {req.refusal_reason && <p className="text-xs text-slate-400 italic mt-0.5">Reason: {req.refusal_reason}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {requests.length === 0 && !pendingAssignment && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Truck className="size-7 text-slate-400" /></div>
              <p className="text-slate-400 text-sm font-medium text-center">No requests yet.<br />Browse fleet vehicles to request one.</p>
            </div>
          )}

          {error   && <div className="flex gap-2 items-center p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30"><AlertTriangle className="size-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-600 font-medium">{error}</p></div>}
          {success && <div className="flex gap-2 items-center p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30"><CheckCircle className="size-4 text-green-600 flex-shrink-0" /><p className="text-sm text-green-700 font-bold">{success}</p></div>}
        </div>
      )}

      {/* BROWSE VIEW */}
      {view === 'browse' && (
        <div className="p-4 space-y-3">
          {fleet.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><Truck className="size-7 text-slate-400" /></div>
              <p className="text-slate-400 text-sm font-medium text-center">No fleet vehicles available.<br />Check back later or contact admin.</p>
            </div>
          ) : (
            fleet.map(v => {
              const types = (v.supported_item_types || '').split(',').filter(Boolean);
              return (
                <div key={v.plate_number} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                        <Truck className="size-6 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 dark:text-white font-mono tracking-wider">{v.plate_number}</p>
                        <p className="text-sm text-slate-500">{v.vehicle_type}{v.model ? ` · ${v.model}` : ''}</p>
                        {v.capacity_tons != null && <p className="text-xs text-slate-400">{v.capacity_tons} tons capacity</p>}
                      </div>
                    </div>
                    <button onClick={() => requestVehicle(v.plate_number)} disabled={submitting} className="flex-shrink-0 px-4 py-2 bg-orange-600 text-white font-bold rounded-xl text-xs active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-orange-600/20">
                      {submitting ? <Loader2 className="size-3.5 animate-spin" /> : 'Request'}
                    </button>
                  </div>
                  {types.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800">
                      <span className="text-[9px] font-black uppercase text-slate-400 mr-1 self-center">Supports:</span>
                      {types.map(t => <span key={t} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{t}</span>)}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {error && <div className="flex gap-2 items-center p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30"><AlertTriangle className="size-4 text-red-500 flex-shrink-0" /><p className="text-sm text-red-600 font-medium">{error}</p></div>}
        </div>
      )}

      {/* REFUSE VIEW */}
      {view === 'refuse' && refuseTarget && (
        <div className="p-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <XCircle className="size-6 text-red-500" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white">Refuse Assignment</p>
                <p className="text-sm text-slate-500 font-mono">{refuseTarget.vehicle_plate} · {refuseTarget.vehicle_type}</p>
              </div>
            </div>
            <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">
              <MessageSquare className="size-3 inline mr-1" /> Reason for refusing <span className="text-red-500">*</span>
            </label>
            <textarea
              value={refuseReason}
              onChange={e => setRefuseReason(e.target.value)}
              placeholder="e.g. Vehicle has damage, I already have my own vehicle, wrong vehicle type..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500 transition-all resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setView('list'); setRefuseReason(''); }} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-600 dark:text-slate-400">
                Cancel
              </button>
              <button onClick={() => respond(refuseTarget.id, 'refuse', refuseReason)} disabled={submitting || !refuseReason.trim()} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl text-sm active:scale-95 transition-all disabled:opacity-50">
                {submitting ? <Loader2 className="size-4 animate-spin mx-auto" /> : 'Confirm Refuse'}
              </button>
            </div>
            {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
