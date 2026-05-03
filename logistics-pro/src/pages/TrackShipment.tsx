import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import { rateDelivery, getDeliveryRating, getChatContact } from '../lib/api';
import DeliveryChat from '../components/DeliveryChat';
import {
  Truck, Package as PackageIcon, Check, ArrowLeft,
  MapPin, CheckCircle2, Circle, Clock,
  MessageSquare, RefreshCw, User, Phone, Navigation,
  X, ZoomIn, Star, MessageCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

// Google Maps embed — zero dependencies, always works, follows roads automatically
function LiveDriverMap({ driverGPS, pickupGPS, destGPS }: {
  driverGPS: [number, number] | null;
  pickupGPS: [number, number] | null;
  destGPS: [number, number] | null;
}) {
  // Build Google Maps embed URL showing the route
  const buildMapUrl = () => {
    // If we have driver position, center on driver with destination direction
    if (driverGPS && destGPS) {
      const origin = `${driverGPS[0]},${driverGPS[1]}`;
      const dest = `${destGPS[0]},${destGPS[1]}`;
      return `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${origin}&destination=${dest}&mode=driving&zoom=14`;
    }
    // If we have pickup + destination, show the full route
    if (pickupGPS && destGPS) {
      const origin = `${pickupGPS[0]},${pickupGPS[1]}`;
      const dest = `${destGPS[0]},${destGPS[1]}`;
      return `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${origin}&destination=${dest}&mode=driving&zoom=13`;
    }
    // Fallback — just show the destination
    if (destGPS) {
      return `https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${destGPS[0]},${destGPS[1]}&zoom=14`;
    }
    return null;
  };

  const mapUrl = buildMapUrl();
  if (!mapUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <Truck className="size-8 text-slate-300 dark:text-slate-600" />
        <p className="text-xs text-slate-400 font-medium">Waiting for driver GPS signal...</p>
      </div>
    );
  }

  return (
    <iframe
      src={mapUrl}
      className="w-full h-full border-0"
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title="Live Delivery Map"
    />
  );
}

class DetailErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean; errorMsg: string}> {
  constructor(props: any) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, errorMsg: String(error?.message || error) }; }
  componentDidCatch(error: any) { console.error('TrackShipment render error:', error); }
  render() {
    if (this.state.hasError) return (
      <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
        <PackageIcon className="size-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h2>
        <p className="text-xs text-red-400 mt-2 text-center max-w-xs break-all">{this.state.errorMsg}</p>
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
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [showPhotoZoom, setShowPhotoZoom] = useState(false);
  // Rating
  const [userRating, setUserRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [existingRating, setExistingRating] = useState<number | null>(null);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingMsg, setRatingMsg] = useState('');
  const [showChat, setShowChat] = useState(false);

  const fetchDelivery = async (silent = false) => {
    if (!trackingNumber) return;
    if (silent) setRefreshing(true);
    try {
      const result = await deliveryService.getDeliveryByTracking(trackingNumber);
      if (result?.shipment) {
        const s = result.shipment;
        // Use sender_name from shipment (what user typed), fallback to profile name
        const senderFull = s.sender_name
          || ((s.first_name || s.last_name) ? `${s.first_name || ''} ${s.last_name || ''}`.trim() : null)
          || s.client_name || 'Sender';

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

        // Extract GPS positions (safely — columns may not exist yet)
        try {
          if (s.driver_lat && s.driver_lng) setDriverGPS([parseFloat(s.driver_lat), parseFloat(s.driver_lng)]);
          if (s.pickup_lat && s.pickup_lng) setPickupGPS([parseFloat(s.pickup_lat), parseFloat(s.pickup_lng)]);
          if (s.dropoff_lat && s.dropoff_lng) setDestGPS([parseFloat(s.dropoff_lat), parseFloat(s.dropoff_lng)]);
        } catch { /* GPS columns may not exist in DB yet */ }

        // Proof of delivery photo
        if (s.proof_photo_url) setProofPhoto(s.proof_photo_url);
        else setProofPhoto(null);

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

  // Fetch existing rating
  useEffect(() => {
    if (!trackingNumber) return;
    getDeliveryRating(trackingNumber).then(r => {
      if (r) { setExistingRating(r.rating); setUserRating(r.rating); }
    }).catch(() => {});
  }, [trackingNumber]);

  const handleSubmitRating = async () => {
    if (!trackingNumber || userRating < 1) return;
    setSubmittingRating(true);
    try {
      await rateDelivery(trackingNumber, userRating, ratingComment || undefined);
      setExistingRating(userRating);
      setRatingMsg('Thank you for your rating!');
    } catch (err: any) {
      setRatingMsg(err.message || 'Failed to submit');
    } finally {
      setSubmittingRating(false);
    }
  };

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
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                {delivery.status === 'Out for Delivery' ? 'Driver is on the way!' : 'Live Driver Location'}
              </p>
            </div>
            {driverGPS && (
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[9px] font-bold text-green-600">Live</span>
              </div>
            )}
          </div>
          {delivery.status === 'Out for Delivery' && (
            <div className="mx-4 mb-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2">
              <Truck className="size-4 text-green-500 flex-shrink-0" />
              <p className="text-[11px] font-bold text-green-600">Your package is nearby! The driver is heading to your location.</p>
            </div>
          )}
          <div className="h-[220px] w-full">
            <LiveDriverMap driverGPS={driverGPS} pickupGPS={pickupGPS} destGPS={destGPS} />
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

      {/* ── Proof of Delivery ── */}
      {isDelivered && proofPhoto && (
        <div className="mx-4 mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-green-500" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Proof of Delivery</p>
          </div>
          <div className="px-4 pb-4">
            <button onClick={() => setShowPhotoZoom(true)} className="relative w-full group">
              <img
                src={proofPhoto}
                alt="Proof of delivery"
                className="w-full h-52 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
              />
              <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 rounded-xl flex items-center justify-center transition-all">
                <div className="bg-black/50 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 opacity-80">
                  <ZoomIn className="size-3 text-white" />
                  <span className="text-white text-[10px] font-bold">Tap to zoom</span>
                </div>
              </div>
            </button>
            <p className="text-[10px] text-slate-400 mt-2 text-center">Photo taken by driver upon delivery</p>
          </div>
        </div>
      )}

      {/* ── Fullscreen Photo Zoom ── */}
      {showPhotoZoom && proofPhoto && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setShowPhotoZoom(false)}
        >
          <button
            onClick={() => setShowPhotoZoom(false)}
            className="absolute top-12 right-4 z-10 size-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center"
          >
            <X className="size-5 text-white" />
          </button>
          <div
            className="w-full h-full flex items-center justify-center p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={proofPhoto}
              alt="Proof of delivery - zoomed"
              className="max-w-none w-full object-contain"
              style={{ touchAction: 'pinch-zoom', maxHeight: '85vh' }}
            />
          </div>
        </div>
      )}

      {/* ── Rate Delivery ── */}
      {isDelivered && (
        <div className="mx-4 mt-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="px-4 pt-4 pb-2 flex items-center gap-2">
            <Star className="size-3.5 text-orange-500" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {existingRating ? 'Your Rating' : 'Rate This Delivery'}
            </p>
          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => { if (!existingRating) setUserRating(s); }}
                  disabled={!!existingRating}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    className={cn(
                      'size-9 transition-colors',
                      s <= userRating
                        ? 'text-orange-500 fill-orange-500'
                        : 'text-slate-200 dark:text-slate-700'
                    )}
                  />
                </button>
              ))}
            </div>
            {existingRating ? (
              <p className="text-center text-green-500 text-xs font-bold mt-2">Thank you for your feedback!</p>
            ) : (
              <>
                {userRating > 0 && (
                  <>
                    <textarea
                      value={ratingComment}
                      onChange={e => setRatingComment(e.target.value)}
                      placeholder="Leave a comment (optional)"
                      rows={2}
                      className="w-full mt-2 px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 resize-none"
                    />
                    <button
                      onClick={handleSubmitRating}
                      disabled={submittingRating}
                      className="w-full mt-2 py-3 bg-orange-600 text-white font-bold text-sm rounded-xl active:scale-[0.98] transition-all disabled:opacity-60"
                    >
                      {submittingRating ? 'Submitting...' : 'Submit Rating'}
                    </button>
                  </>
                )}
                {ratingMsg && <p className="text-center text-green-500 text-xs font-bold mt-2">{ratingMsg}</p>}
              </>
            )}
          </div>
        </div>
      )}

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

        {/* Chat & Call buttons — only during active delivery with assigned driver */}
        {(delivery.status === 'In Transit' || delivery.status === 'Out for Delivery') && extra.driverName ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowChat(true)}
              className="py-3 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-orange-600/20"
            >
              <MessageCircle className="size-4" />
              Chat Driver
            </button>
            <button
              onClick={async () => {
                try {
                  const c = await getChatContact(trackingNumber!);
                  if (c.phone) window.location.href = `tel:${c.phone}`;
                  else alert('Driver phone number is not available.');
                } catch { alert('Unable to get contact info.'); }
              }}
              className="py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-2 text-white shadow-lg shadow-emerald-500/20"
            >
              <Phone className="size-4" />
              Call Driver
            </button>
          </div>
        ) : (
          <button className="mt-5 w-full py-3 bg-white/10 hover:bg-white/20 active:scale-[0.98] transition-all rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-2 text-white">
            <MessageSquare className="size-4" />
            Contact Support
          </button>
        )}
      </div>
      {/* Chat overlay */}
      {showChat && trackingNumber && (
        <DeliveryChat deliveryNumber={trackingNumber} onClose={() => setShowChat(false)} />
      )}
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
