import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import {
  Truck, Package as PackageIcon, Check, ArrowLeft,
  MapPin, CheckCircle2, Circle, Clock,
  MessageSquare, RefreshCw, User, Phone, Navigation
} from 'lucide-react';
import { cn } from '../lib/utils';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Map icons ──
const DriverMapIcon = L.divIcon({
  html: `<div style="background:#ea580c;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(234,88,12,0.5);border:3px solid white;animation:pulse 2s infinite">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" ry="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  </div>`,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

const PickupMapIcon = L.divIcon({
  html: `<div style="background:#f97316;border-radius:50% 50% 50% 0;width:32px;height:32px;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(249,115,22,0.5);border:2px solid white;display:flex;align-items:center;justify-content:center;">
    <div style="transform:rotate(45deg);width:8px;height:8px;background:white;border-radius:50%"></div>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const DestMapIcon = L.divIcon({
  html: `<div style="background:#22c55e;border-radius:50% 50% 50% 0;width:32px;height:32px;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(34,197,94,0.5);border:2px solid white;display:flex;align-items:center;justify-content:center;">
    <div style="transform:rotate(45deg);width:8px;height:8px;background:white;border-radius:50%"></div>
  </div>`,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Auto-fit map bounds to show all markers
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (points.length >= 2 && !fitted.current) {
      map.fitBounds(L.latLngBounds(points.map(p => L.latLng(p[0], p[1]))), { padding: [40, 40] });
      fitted.current = true;
    }
  }, [points, map]);
  return null;
}

// Smoothly re-center on driver position updates
function FollowDriver({ pos }: { pos: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.panTo(pos, { animate: true, duration: 1 }); }, [pos, map]);
  return null;
}

class DetailErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error('TrackShipment render error:', error); }
  render() {
    if (this.state.hasError) return (
      <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
        <PackageIcon className="size-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h2>
        <button onClick={() => window.history.back()} className="mt-6 text-orange-600 font-bold">Go Back</button>
      </div>
    );
    return this.props.children;
  }
}

interface CheckpointItem {
  status: string;
  location?: string;
  description?: string;
  timestamp: string;
}

interface ShipmentExtra {
  driverName?: string;
  driverPlate?: string;
  driverVehicleType?: string;
  senderFullName?: string;
}

function TrackShipmentInner() {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [extra, setExtra] = useState<ShipmentExtra>({});
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Live driver GPS
  const [driverGPS, setDriverGPS] = useState<[number, number] | null>(null);
  const [pickupGPS, setPickupGPS] = useState<[number, number] | null>(null);
  const [destGPS, setDestGPS] = useState<[number, number] | null>(null);

  const fetchDelivery = async (silent = false) => {
    if (!trackingNumber) return;
    if (silent) setRefreshing(true);
    try {
      const result = await deliveryService.getDeliveryByTracking(trackingNumber);
      if (result?.shipment) {
        const s = result.shipment;
        // Build sender display name
        const senderFull = (s.first_name || s.last_name)
          ? `${s.first_name || ''} ${s.last_name || ''}`.trim()
          : (s.client_name || 'Sender');

        setExtra({
          driverName: s.driver_name || null,
          driverPlate: s.driver_plate || null,
          driverVehicleType: s.driver_vehicle_type || null,
          senderFullName: senderFull,
        });

        const mapped: Delivery = {
          id: s.delivery_number || trackingNumber,
          trackingNumber: s.delivery_number || trackingNumber,
          senderUid: s.sender_user_id?.toString() || '',
          senderName: senderFull,
          receiverName: s.receiver_name || '',
          receiverPhone: s.receiver_phone || '',
          origin: s.pickup_location || '',
          destination: s.dropoff_location || '',
          status: normalizeStatus(s.status),
          estimatedArrival: s.estimated_arrival || 'Calculating...',
          weight: s.weight || 0,
          size: s.size || s.item_type_flag || '',
          shippingMethod: s.shipping_method || 'Standard',
          totalFee: s.total_fee || 0,
          history: [],
          createdAt: s.created_at || new Date().toISOString()
        };
        setDelivery(mapped);

        // Extract GPS positions
        if (s.driver_lat && s.driver_lng) setDriverGPS([parseFloat(s.driver_lat), parseFloat(s.driver_lng)]);
        if (s.pickup_lat && s.pickup_lng) setPickupGPS([parseFloat(s.pickup_lat), parseFloat(s.pickup_lng)]);
        if (s.dropoff_lat && s.dropoff_lng) setDestGPS([parseFloat(s.dropoff_lat), parseFloat(s.dropoff_lng)]);

        const raw: CheckpointItem[] = (result.history || []).map((h: any) => ({
          status: h.status || '',
          location: h.location || '',
          description: h.description || h.status || '',
          timestamp: h.created_at || new Date().toISOString(),
        }));
        setCheckpoints(raw.slice().reverse()); // newest first
      } else {
        setError('Shipment not found');
      }
    } catch {
      setError('Failed to load shipment');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDelivery();
    // Poll every 10 seconds for live driver position updates
    const interval = setInterval(() => fetchDelivery(true), 10000);
    return () => clearInterval(interval);
  }, [trackingNumber]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
      <div className="size-12 rounded-full border-4 border-orange-600 border-t-transparent animate-spin mb-4" />
      <p className="text-slate-500 text-sm">Loading shipment details...</p>
    </div>
  );

  if (!delivery) return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 text-center bg-white dark:bg-slate-900">
      <PackageIcon className="size-16 text-slate-300 dark:text-slate-600 mb-4" />
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shipment Not Found</h2>
      <p className="text-slate-500 mt-2">{error || `No shipment with tracking number ${trackingNumber}`}</p>
      <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl">Go Back</button>
    </div>
  );

  const isDelivered = delivery.status === 'Delivered';

  const statusSteps = [
    { key: 'Processing',       label: 'Order\nPlaced'   },
    { key: 'In Transit',       label: 'In\nTransit'     },
    { key: 'Out for Delivery', label: 'Out for\nDelivery' },
    { key: 'Delivered',        label: 'Delivered'       },
  ];
  const currentIdx = statusSteps.findIndex(s => s.key === delivery.status);

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950 pb-24">

      {/* ── Header ── */}
      <header className="flex items-center gap-3 px-4 py-3.5 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="text-slate-700 dark:text-slate-300 size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-extrabold text-slate-900 dark:text-white">Track Shipment</h1>
          <p className="text-[10px] text-slate-400 font-mono tracking-widest">{trackingNumber}</p>
        </div>
        <button onClick={() => fetchDelivery(true)} className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <RefreshCw className={cn('size-4 text-slate-500', refreshing && 'animate-spin text-orange-600')} />
        </button>
      </header>

      {/* ── Status banner ── */}
      <div className={cn(
        'mx-4 mt-4 rounded-2xl p-4 flex items-center gap-4',
        isDelivered ? 'bg-green-500' : 'bg-orange-600'
      )}>
        <div className={cn('size-12 rounded-xl flex items-center justify-center bg-white/20')}>
          {isDelivered ? <CheckCircle2 className="size-6 text-white" /> : <Truck className="size-6 text-white" />}
        </div>
        <div>
          <p className="font-extrabold text-white text-sm leading-tight">
            {isDelivered ? 'Your order has been delivered!' : `Your order is ${delivery.status}`}
          </p>
          <p className="text-white/75 text-xs mt-0.5">ETA: {delivery.estimatedArrival || 'Calculating...'}</p>
        </div>
      </div>

      {/* ── Progress stepper ── */}
      <div className="mx-4 mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-start">
          {statusSteps.map((step, i) => {
            const done   = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div className={cn(
                    'size-8 rounded-full flex items-center justify-center transition-all shadow-sm',
                    done
                      ? active
                        ? 'bg-orange-600 ring-4 ring-orange-600/20 scale-110 shadow-orange-600/20'
                        : 'bg-green-500 shadow-green-500/20'
                      : 'bg-slate-200 dark:bg-slate-700'
                  )}>
                    {done
                      ? active ? <Truck className="size-3.5 text-white" /> : <Check className="size-3.5 text-white" />
                      : <Circle className="size-3.5 text-slate-400" />
                    }
                  </div>
                  <p className={cn(
                    'text-[8px] font-bold text-center leading-tight whitespace-pre-line max-w-[48px]',
                    done ? (active ? 'text-orange-600' : 'text-green-600') : 'text-slate-400'
                  )}>
                    {step.label}
                  </p>
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mx-1 mt-4 rounded-full transition-colors',
                    i < currentIdx ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Live Map ── */}
      {(delivery.status === 'In Transit' || delivery.status === 'Out for Delivery') && (
        <div className="mx-4 mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Navigation className="size-3.5 text-orange-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Live Driver Location</p>
            </div>
            {driverGPS && (
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-bold text-green-600">Live</span>
              </div>
            )}
          </div>
          <div className="h-[220px] w-full">
            {(driverGPS || pickupGPS || destGPS) ? (
              <MapContainer
                center={driverGPS || destGPS || pickupGPS || [14.5995, 120.9842]}
                zoom={14}
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
                attributionControl={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Auto-fit bounds */}
                <FitBounds points={[pickupGPS, destGPS, driverGPS].filter(Boolean) as [number,number][]} />

                {/* Follow driver position */}
                {driverGPS && <FollowDriver pos={driverGPS} />}

                {/* Pickup marker */}
                {pickupGPS && <Marker position={pickupGPS} icon={PickupMapIcon} />}

                {/* Destination marker */}
                {destGPS && <Marker position={destGPS} icon={DestMapIcon} />}

                {/* Driver marker */}
                {driverGPS && <Marker position={driverGPS} icon={DriverMapIcon} />}

                {/* Route line: pickup → driver → destination */}
                {pickupGPS && destGPS && (
                  <Polyline
                    positions={driverGPS ? [pickupGPS, driverGPS, destGPS] : [pickupGPS, destGPS]}
                    pathOptions={{ color: '#ea580c', weight: 3, dashArray: '8, 6', opacity: 0.7 }}
                  />
                )}
              </MapContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2">
                <Truck className="size-8 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-400 font-medium">Waiting for driver GPS signal...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Route ── */}
      <div className="mx-4 mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4">Route</p>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-1 flex-shrink-0">
            <div className="size-2.5 rounded-full bg-orange-500 ring-2 ring-orange-500/30" />
            <div className="w-px h-8 bg-gradient-to-b from-orange-500 to-green-500" />
            <div className="size-2.5 rounded-full bg-green-500 ring-2 ring-green-500/30" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <p className="text-[9px] font-black uppercase text-orange-500 mb-0.5">Pickup</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{delivery.origin || 'Origin'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-green-600 mb-0.5">Destination</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{delivery.destination || 'Destination'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tracking Timeline ── */}
      <div className="mx-4 mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-slate-50 dark:border-slate-800">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tracking History</p>
          <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
            {checkpoints.length} {checkpoints.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {checkpoints.length === 0 ? (
          <div className="px-4 py-6 flex items-center gap-3 text-slate-400">
            <Clock className="size-5 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold">No tracking events yet</p>
              <p className="text-xs text-slate-400 mt-0.5">Updates will appear here once your shipment is picked up</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-0">
            {checkpoints.map((cp, i) => {
              const ts = new Date(cp.timestamp);
              const dateStr  = ts.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
              const timeStr  = ts.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
              const isFirst  = i === 0;
              const isDone   = cp.status === 'Delivered';

              return (
                <div key={i} className="flex gap-0 relative">
                  {/* Connecting vertical line */}
                  {i < checkpoints.length - 1 && (
                    <div className="absolute left-[68px] top-5 bottom-0 w-px bg-slate-100 dark:bg-slate-800 z-0" />
                  )}

                  {/* Date/time */}
                  <div className="w-[60px] flex-shrink-0 text-right pr-3 pt-1.5">
                    <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">{dateStr}</p>
                    <p className="text-[9px] text-slate-400 leading-tight mt-0.5">{timeStr}</p>
                  </div>

                  {/* Dot */}
                  <div className="relative flex items-start pt-2 z-10 flex-shrink-0">
                    <div className={cn(
                      'size-2.5 rounded-full ring-4',
                      isFirst
                        ? isDone
                          ? 'bg-green-500 ring-green-500/20'
                          : 'bg-orange-600 ring-orange-600/15'
                        : 'bg-slate-300 dark:bg-slate-600 ring-slate-50 dark:ring-slate-900'
                    )} />
                  </div>

                  {/* Content */}
                  <div className="pl-4 pb-7 flex-1">
                    {isFirst && (
                      <span className={cn(
                        'inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full mb-1.5',
                        isDone
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                          : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                      )}>
                        {isDone ? '✓ Delivered' : '● Latest Update'}
                      </span>
                    )}
                    <p className={cn(
                      'text-sm font-bold leading-snug',
                      isFirst
                        ? isDone ? 'text-green-600' : 'text-orange-600'
                        : 'text-slate-700 dark:text-slate-200'
                    )}>
                      {cp.description || cp.status}
                    </p>
                    {cp.location && (
                      <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                        <MapPin className="size-3 flex-shrink-0 mt-0.5" />
                        <span>{cp.location}</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Shipment Information ── */}
      <div className="mx-4 mt-3 bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-28 h-28 bg-orange-600/10 rounded-full blur-2xl pointer-events-none" />
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 pb-3 border-b border-white/10">
          Shipment Information
        </p>

        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
          {/* Sender */}
          <div>
            <p className="text-[9px] text-orange-500 font-black uppercase mb-1.5 flex items-center gap-1">
              <User className="size-2.5" /> From (Sender)
            </p>
            <p className="text-sm font-bold text-white leading-tight">{extra.senderFullName || delivery.senderName || 'Sender'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{delivery.origin || '—'}</p>
          </div>

          {/* Receiver */}
          <div>
            <p className="text-[9px] text-orange-500 font-black uppercase mb-1.5 flex items-center gap-1">
              <User className="size-2.5" /> To (Recipient)
            </p>
            <p className="text-sm font-bold text-white leading-tight">{delivery.receiverName || 'Recipient'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{delivery.destination || '—'}</p>
          </div>

          {/* Driver */}
          <div className="col-span-2 border-t border-white/10 pt-4">
            <p className="text-[9px] text-orange-500 font-black uppercase mb-1.5 flex items-center gap-1">
              <Truck className="size-2.5" /> Assigned Driver
            </p>
            {extra.driverName ? (
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <User className="size-4 text-white/60" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{extra.driverName}</p>
                  {extra.driverPlate && (
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {extra.driverPlate} · {extra.driverVehicleType || ''}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">Not yet assigned</p>
            )}
          </div>

          {/* Fee + Weight */}
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Total Fee</p>
            <p className="text-xl font-black text-white">₱{Number(delivery.totalFee || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Weight</p>
            <p className="text-sm font-bold text-white">{delivery.weight || 0} kg</p>
          </div>
        </div>

        <button className="mt-5 w-full py-3 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-2 text-white">
          <MessageSquare className="size-4" />
          Contact Support
        </button>
      </div>
    </div>
  );
}

function normalizeStatus(status: string): 'Processing' | 'In Transit' | 'Out for Delivery' | 'Delivered' {
  const map: Record<string, any> = {
    'Pending': 'Processing', 'Processing': 'Processing',
    'In-Transit': 'In Transit', 'In Transit': 'In Transit',
    'Out for Delivery': 'Out for Delivery', 'Delivered': 'Delivered',
    'Failed': 'Processing'
  };
  return map[status] || 'Processing';
}

export default function TrackShipment() {
  return (
    <DetailErrorBoundary>
      <TrackShipmentInner />
    </DetailErrorBoundary>
  );
}
