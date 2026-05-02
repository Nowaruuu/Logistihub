import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Package, Clock, Navigation, Truck, ChevronRight, RefreshCw, MapPinOff } from 'lucide-react';
import Map from '../components/Map';
import { useAuth } from '../hooks/useAuth';
import { deliveryService } from '../services/deliveryService';
import { cn } from '../lib/utils';
import { Delivery } from '../types';

// ── Driver View: Nearby Available Pickups ──────────────────────────────────────
function DriverNearbyView() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [driverPos, setDriverPos] = useState<[number, number]>([14.5995, 120.9842]);
  const navigate = useNavigate();

  const fetchJobs = useCallback(async () => {
    try {
      const data = await deliveryService.getAvailableDeliveries();
      setDeliveries(data || []);
      if (data?.length && !selected) setSelected(data[0]);
    } catch { setDeliveries([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 30000);
    // Try to get driver's real position
    navigator.geolocation?.getCurrentPosition(
      pos => setDriverPos([pos.coords.latitude, pos.coords.longitude]),
      () => {}
    );
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const markers = deliveries.slice(0, 20).map(d => {
    const lat = d.currentLat || d.pickupLat;
    const lng = d.currentLng || d.pickupLng;
    if (!lat || !lng) return null;
    return { position: [lat, lng] as [number, number], label: d.trackingNumber || 'Pickup' };
  }).filter(Boolean) as { position: [number, number]; label: string }[];

  // Add driver position marker
  markers.unshift({ position: driverPos, label: '📍 You' });

  const mapCenter = selected?.pickupLat && selected?.pickupLng
    ? [selected.pickupLat, selected.pickupLng] as [number, number]
    : driverPos;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Map */}
      <div className="relative w-full h-56 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800">
        <Map center={mapCenter} zoom={12} markers={markers} />
        <button
          onClick={() => { setLoading(true); fetchJobs(); }}
          className="absolute top-3 right-3 size-9 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center"
        >
          <RefreshCw className={cn("size-4 text-slate-600 dark:text-slate-300", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-orange-600">{deliveries.length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600/70 mt-1">Available Pickups</p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{markers.length - 1}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600/70 mt-1">On Map</p>
        </div>
      </div>

      {/* Job list */}
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mt-2">Nearby Pickups</h2>
      {deliveries.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <MapPinOff className="size-7 text-slate-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium">No available pickups nearby</p>
          <p className="text-slate-400/60 text-xs">Check back later for new deliveries</p>
        </div>
      )}
      <div className="space-y-3 pb-8">
        {deliveries.slice(0, 15).map((d, i) => (
          <button
            key={d.id || i}
            onClick={() => { setSelected(d); navigate('/driver/jobs'); }}
            className={cn(
              "w-full text-left bg-white dark:bg-slate-800/60 rounded-2xl border p-4 active:scale-[0.99] transition-all",
              selected?.id === d.id
                ? "border-orange-500 ring-1 ring-orange-500/30"
                : "border-slate-100 dark:border-slate-800"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                  <Package className="size-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">#{d.trackingNumber || 'N/A'}</p>
                  <p className="text-[10px] text-slate-400">{d.packageType || 'Standard'} • {d.weight || '—'}kg</p>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-300" />
            </div>
            <div className="flex items-start gap-2 mt-2">
              <MapPin className="size-3 text-green-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug truncate">{d.origin || 'Pickup location'}</p>
            </div>
            <div className="flex items-start gap-2 mt-1">
              <MapPin className="size-3 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug truncate">{d.destination || 'Drop-off location'}</p>
            </div>
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50 dark:border-slate-700">
              <span className="text-xs font-extrabold text-orange-600">₱{Number(d.totalFee || 0).toFixed(0)}</span>
              <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">View Details →</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Customer View: Live Delivery Map ───────────────────────────────────────────
function CustomerTrackingView() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Delivery | null>(null);
  const navigate = useNavigate();

  const fetchDeliveries = useCallback(async () => {
    try {
      const data = await deliveryService.getAllDeliveries();
      const active = (data || []).filter((d: Delivery) =>
        ['In Transit', 'Out for Delivery', 'Processing'].includes(d.status || '')
      );
      setDeliveries(active);
      if (active.length && !selected) setSelected(active[0]);
    } catch { setDeliveries([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 15000);
    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  const markers = deliveries.map(d => {
    const lat = d.currentLat || d.pickupLat;
    const lng = d.currentLng || d.pickupLng;
    if (!lat || !lng) return null;
    return { position: [lat, lng] as [number, number], label: `#${d.trackingNumber}` };
  }).filter(Boolean) as { position: [number, number]; label: string }[];

  const mapCenter = markers.length > 0 ? markers[0].position : [14.5995, 120.9842] as [number, number];

  const statusColor: Record<string, string> = {
    'Processing': 'bg-slate-100 dark:bg-slate-700 text-slate-500',
    'In Transit': 'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
    'Out for Delivery': 'bg-amber-50 dark:bg-amber-900/30 text-amber-600',
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Map */}
      <div className="relative w-full h-56 rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800">
        <Map center={mapCenter} zoom={11} markers={markers} />
        <button
          onClick={() => { setLoading(true); fetchDeliveries(); }}
          className="absolute top-3 right-3 size-9 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center"
        >
          <RefreshCw className={cn("size-4 text-slate-600 dark:text-slate-300", loading && "animate-spin")} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{deliveries.filter(d => d.status === 'In Transit').length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600/70 mt-1">In Transit</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 text-center">
          <p className="text-2xl font-black text-amber-600">{deliveries.filter(d => d.status === 'Out for Delivery').length}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600/70 mt-1">Out for Delivery</p>
        </div>
      </div>

      {/* Active shipments list */}
      <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mt-2">Active Shipments</h2>
      {deliveries.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Truck className="size-7 text-slate-400" />
          </div>
          <p className="text-slate-400 text-sm font-medium">No active shipments</p>
          <p className="text-slate-400/60 text-xs">Send a package to see it tracked here</p>
        </div>
      )}
      <div className="space-y-3 pb-8">
        {deliveries.map((d, i) => (
          <button
            key={d.id || i}
            onClick={() => d.trackingNumber && navigate(`/track/${d.trackingNumber}`)}
            className={cn(
              "w-full text-left bg-white dark:bg-slate-800/60 rounded-2xl border p-4 active:scale-[0.99] transition-all",
              selected?.id === d.id
                ? "border-blue-500 ring-1 ring-blue-500/30"
                : "border-slate-100 dark:border-slate-800"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <Truck className="size-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">#{d.trackingNumber || 'N/A'}</p>
                  <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', statusColor[d.status || ''] || statusColor['Processing'])}>
                    {d.status}
                  </span>
                </div>
              </div>
              <ChevronRight className="size-4 text-slate-300" />
            </div>
            <div className="flex items-start gap-2 mt-2">
              <MapPin className="size-3 text-green-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug truncate">{d.origin || 'Origin'}</p>
            </div>
            <div className="flex items-start gap-2 mt-1">
              <MapPin className="size-3 text-red-500 mt-0.5 shrink-0" />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug truncate">{d.destination || 'Destination'}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main export: switches by role ──────────────────────────────────────────────
export default function Stations() {
  const { profile } = useAuth();
  const isDriver = profile?.role === 'driver';

  return isDriver ? <DriverNearbyView /> : <CustomerTrackingView />;
}
