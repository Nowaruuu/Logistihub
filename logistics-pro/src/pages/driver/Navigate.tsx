import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft, Navigation, MapPin, Package, CheckCircle2,
  Loader2, RefreshCw, User, Phone
} from 'lucide-react';

// ── OSRM road-following route ──
function RoadRoute({ from, to }: { from: [number, number]; to: [number, number] }) {
  const [roadCoords, setRoadCoords] = useState<[number, number][]>([from, to]);
  const prevKey = useRef('');

  useEffect(() => {
    // Round to ~55m precision to avoid refetching on tiny GPS jitter
    const key = `${from[0].toFixed(4)},${from[1].toFixed(4)}|${to[0].toFixed(4)},${to[1].toFixed(4)}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    const coords = `${from[1]},${from[0]};${to[1]},${to[0]}`;
    fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          setRoadCoords(data.routes[0].geometry.coordinates.map((c: number[]) => [c[1], c[0]] as [number, number]));
        } else {
          setRoadCoords([from, to]);
        }
      })
      .catch(() => setRoadCoords([from, to]));
  }, [from[0], from[1], to[0], to[1]]);

  return (
    <Polyline
      positions={roadCoords}
      pathOptions={{ color: '#ea580c', weight: 4, opacity: 0.85 }}
    />
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────
const DriverIcon = L.divIcon({
  html: `<div style="background:#ea580c;border-radius:50%;width:44px;height:44px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(234,88,12,0.5);border:3px solid white;">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const DestIcon = L.divIcon({
  html: `<div style="background:#2563eb;border-radius:50% 50% 50% 0;width:36px;height:36px;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(37,99,235,0.5);border:2px solid white;display:flex;align-items:center;justify-content:center;">
    <div style="transform:rotate(45deg);width:10px;height:10px;background:white;border-radius:50%;margin:auto;"></div>
  </div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

// ── Auto-center map on position change ─────────────────────────────────────
function LiveCenter({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(pos, map.getZoom()); }, [pos, map]);
  return null;
}

// ── FitBounds ─────────────────────────────────────────────────────────────
function FitRoute({ from, to }: { from: [number, number]; to: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([from, to]);
    map.fitBounds(bounds, { padding: [60, 60] });
  }, []);
  return null;
}

export interface NavigateJob {
  id: string;
  trackingNumber: string;
  receiverName?: string;
  receiverPhone?: string;
  destination: string;
  destLat?: number | null;
  destLng?: number | null;
  origin?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  status?: string;
}

const API_BASE = 'https://logistichub.ddns.net';
function mobileUrl(path: string) {
  const slug = localStorage.getItem('auth_slug') || '';
  return `${API_BASE}/${slug}/api/mobile${path}`;
}
function authHeaders() {
  const token = localStorage.getItem('auth_token') || '';
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

export default function DriverNavigate() {
  const navigate = useNavigate();
  const location = useLocation();
  const job = (location.state as { job: NavigateJob })?.job;

  const [driverPos, setDriverPos] = useState<[number, number] | null>(null);
  const [locError, setLocError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const watchRef = useRef<number | null>(null);

  // Default to destination if we can't get location yet
  const destPos: [number, number] | null =
    job?.destLat && job?.destLng ? [job.destLat, job.destLng] : null;

  const mapCenter: [number, number] = driverPos || destPos || [14.5995, 120.9842];

  // Keep a ref to latest position for the upload interval
  const latestPos = useRef<[number, number] | null>(null);

  // Start live GPS tracking + upload to server every 10s
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('GPS not available on this device.');
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setDriverPos(coords);
        latestPos.current = coords;
        setLocError('');
      },
      (err) => {
        setLocError('Could not get your location. Enable GPS and try again.');
        console.warn('Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    // Upload GPS to server every 10 seconds so customers can track the driver
    const uploadInterval = setInterval(() => {
      if (latestPos.current && job?.trackingNumber) {
        fetch(mobileUrl(`/driver/location/${job.trackingNumber}`), {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({ lat: latestPos.current[0], lng: latestPos.current[1] }),
        }).catch(() => {}); // silent — don't block navigation
      }
    }, 10_000);

    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      clearInterval(uploadInterval);
    };
  }, []);

  const handleCompleteDelivery = async () => {
    if (!job) return;
    setCompleting(true);
    try {
      await fetch(mobileUrl(`/driver/status/${job.trackingNumber}`), {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'Delivered', location: job.destination }),
      });
      setCompleted(true);
      setTimeout(() => navigate('/dashboard'), 1800);
    } catch (err) {
      console.error('Failed to complete delivery:', err);
    } finally {
      setCompleting(false);
    }
  };

  if (!job) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 gap-4 p-8">
        <MapPin className="size-12 text-slate-600" />
        <p className="text-slate-400 font-bold text-center">No delivery selected.</p>
        <button onClick={() => navigate('/dashboard')} className="text-orange-500 font-bold text-sm">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col min-h-screen bg-slate-950 overflow-hidden">

      {/* ── Full-screen Map ── */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-follow driver */}
          {driverPos && <LiveCenter pos={driverPos} />}

          {/* Fit map to show both driver + destination on first load */}
          {driverPos && destPos && <FitRoute from={driverPos} to={destPos} />}

          {/* Driver marker */}
          {driverPos && (
            <Marker position={driverPos} icon={DriverIcon}>
              <Popup>You are here</Popup>
            </Marker>
          )}

          {/* Destination marker */}
          {destPos && (
            <Marker position={destPos} icon={DestIcon}>
              <Popup>{job.receiverName || 'Recipient'} – {job.destination}</Popup>
            </Marker>
          )}

          {/* Road-following route: driver → destination */}
          {driverPos && destPos && (
            <RoadRoute from={driverPos} to={destPos} />
          )}
        </MapContainer>
      </div>

      {/* ── Top Bar ── */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-10 pb-4 bg-gradient-to-b from-slate-950/90 to-transparent pointer-events-auto">
        <button
          onClick={() => navigate(-1)}
          className="size-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center border border-white/10"
        >
          <ArrowLeft className="size-5 text-white" />
        </button>
        <div>
          <p className="text-white font-extrabold text-base leading-tight">Navigating</p>
          <p className="text-slate-400 text-xs">#{job.trackingNumber}</p>
        </div>
        {/* GPS status dot */}
        <div className="ml-auto flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
          <div className={`size-2 rounded-full ${driverPos ? 'bg-green-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-white font-bold">{driverPos ? 'GPS Live' : 'Locating…'}</span>
        </div>
      </div>

      {/* ── GPS error banner ── */}
      {locError && (
        <div className="relative z-10 mx-4 bg-red-500/90 backdrop-blur rounded-2xl px-4 py-2.5 flex items-center gap-2">
          <RefreshCw className="size-4 text-white flex-shrink-0" />
          <p className="text-white text-xs font-bold">{locError}</p>
        </div>
      )}

      {/* ── Completed overlay ── */}
      {completed && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-8">
            <div className="size-20 rounded-full bg-green-500 flex items-center justify-center shadow-2xl shadow-green-500/40">
              <CheckCircle2 className="size-10 text-white" />
            </div>
            <p className="text-white text-2xl font-extrabold">Delivered!</p>
            <p className="text-slate-400 text-sm">Returning to dashboard…</p>
          </div>
        </div>
      )}

      {/* ── Bottom Info Card ── */}
      <div className="relative z-10 mt-auto">
        <div className="mx-3 mb-4 bg-slate-900/95 backdrop-blur-xl rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden">

          {/* Destination row */}
          <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-slate-800">
            <div className="size-10 rounded-xl bg-blue-600/15 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MapPin className="size-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Drop-off Address</p>
              <p className="text-white font-bold text-sm leading-snug">{job.destination}</p>
              {!destPos && (
                <p className="text-amber-500 text-[10px] mt-1 font-bold">⚠ No GPS coordinates — route line unavailable</p>
              )}
            </div>
          </div>

          {/* Recipient row */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-800">
            <div className="size-10 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
              <User className="size-4 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Recipient</p>
              <p className="text-white font-bold text-sm">{job.receiverName || '—'}</p>
            </div>
            {job.receiverPhone && (
              <a
                href={`tel:${job.receiverPhone}`}
                className="size-10 rounded-xl bg-green-600/15 flex items-center justify-center"
              >
                <Phone className="size-4 text-green-500" />
              </a>
            )}
          </div>

          {/* Delivery number */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Package className="size-4 text-slate-500" />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Tracking #</p>
            </div>
            <p className="text-white text-sm font-mono font-bold">{job.trackingNumber}</p>
          </div>

          {/* Action button */}
          <div className="px-5 py-4">
            <button
              onClick={handleCompleteDelivery}
              disabled={completing || completed}
              className="w-full flex items-center justify-center gap-2.5 py-4 bg-green-600 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-green-600/30 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {completing ? (
                <><Loader2 className="size-5 animate-spin" />Updating…</>
              ) : (
                <><CheckCircle2 className="size-5" />Mark as Delivered</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
