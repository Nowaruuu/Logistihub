import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import {
  Truck, Package as PackageIcon, Check, ArrowLeft,
  MapPin, Calendar, CheckCircle2, Circle, Clock,
  PhoneCall, MessageSquare, RefreshCw
} from 'lucide-react';
import { cn } from '../lib/utils';

// Error boundary
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

function TrackShipmentInner() {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [checkpoints, setCheckpoints] = useState<CheckpointItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDelivery = async (silent = false) => {
    if (!trackingNumber) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const result = await deliveryService.getDeliveryByTracking(trackingNumber);
      if (result?.shipment) {
        const s = result.shipment;
        const mapped: Delivery = {
          id: s.delivery_number || trackingNumber,
          trackingNumber: s.delivery_number || trackingNumber,
          senderUid: s.sender_user_id?.toString() || '',
          senderName: s.client_name || '',
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

        // Build checkpoint timeline
        const raw: CheckpointItem[] = (result.history || []).map((h: any) => ({
          status: h.status || '',
          location: h.location || '',
          description: h.description || '',
          timestamp: h.created_at || new Date().toISOString(),
        }));
        // Show newest first (like Shopee)
        setCheckpoints(raw.slice().reverse());
      } else {
        setDelivery(null);
        setError('Shipment not found');
      }
    } catch (err) {
      setDelivery(null);
      setError('Failed to load shipment');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDelivery();
    const interval = setInterval(() => fetchDelivery(true), 15000);
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
    { key: 'Processing', label: 'Order Placed' },
    { key: 'In Transit', label: 'In Transit' },
    { key: 'Out for Delivery', label: 'Out for Delivery' },
    { key: 'Delivered', label: 'Delivered' },
  ];
  const currentIdx = statusSteps.findIndex(s => s.key === delivery.status);

  const statusBg: Record<string, string> = {
    'Processing':       'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    'In Transit':       'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
    'Out for Delivery': 'bg-amber-50 dark:bg-amber-900/30 text-amber-600',
    'Delivered':        'bg-green-50 dark:bg-green-900/30 text-green-600',
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950 pb-24">

      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-4 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <ArrowLeft className="text-slate-700 dark:text-slate-300 size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-extrabold text-slate-900 dark:text-white">Track Shipment</h1>
          <p className="text-xs text-slate-400 font-mono">{trackingNumber}</p>
        </div>
        <button
          onClick={() => fetchDelivery(true)}
          className="size-9 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={cn('size-4 text-slate-500', refreshing && 'animate-spin text-orange-600')} />
        </button>
      </header>

      {/* Status banner */}
      <div className={cn(
        'mx-4 mt-4 rounded-2xl p-4 flex items-center gap-3',
        isDelivered
          ? 'bg-green-500 text-white'
          : 'bg-orange-600 text-white'
      )}>
        {isDelivered
          ? <CheckCircle2 className="size-8 flex-shrink-0" />
          : <Truck className="size-8 flex-shrink-0" />
        }
        <div>
          <p className="font-extrabold text-base leading-tight">
            {isDelivered ? 'Your order has been delivered!' : delivery.status}
          </p>
          <p className="text-white/80 text-xs mt-0.5 flex items-center gap-1">
            <Calendar className="size-3" />
            ETA: {delivery.estimatedArrival || 'Calculating...'}
          </p>
        </div>
      </div>

      {/* Progress stepper */}
      <div className="mx-4 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <div className="flex items-start justify-between">
          {statusSteps.map((step, i) => {
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div className={cn(
                    'size-8 rounded-full flex items-center justify-center transition-all',
                    done
                      ? active
                        ? 'bg-orange-600 ring-4 ring-orange-600/20 scale-110'
                        : 'bg-green-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  )}>
                    {done
                      ? active
                        ? <Truck className="size-4 text-white" />
                        : <Check className="size-4 text-white" />
                      : <Circle className="size-4 text-slate-400" />
                    }
                  </div>
                  <span className={cn(
                    'text-[8px] font-bold text-center leading-tight max-w-[50px]',
                    done ? (active ? 'text-orange-600' : 'text-green-600') : 'text-slate-400'
                  )}>
                    {step.label}
                  </span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={cn(
                    'flex-1 h-0.5 mt-4 mx-1 transition-all',
                    i < currentIdx ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                  )} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Route */}
      <div className="mx-4 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Route</p>
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1 pt-1">
            <div className="size-2.5 rounded-full bg-orange-600 ring-2 ring-orange-600/30" />
            <div className="w-0.5 h-8 bg-gradient-to-b from-orange-600 to-green-500" />
            <div className="size-2.5 rounded-full bg-green-500 ring-2 ring-green-500/30" />
          </div>
          <div className="flex-1 space-y-5">
            <div>
              <p className="text-[10px] font-bold uppercase text-orange-600">Pickup</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{delivery.origin || 'Origin'}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-green-600">Destination</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{delivery.destination || 'Destination'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Timeline — Shopee style */}
      <div className="mx-4 mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 pt-5 pb-2 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tracking History</p>
          <span className="text-[10px] font-bold text-slate-400">{checkpoints.length} events</span>
        </div>

        {checkpoints.length === 0 ? (
          <div className="px-5 pb-5 flex items-center gap-3 text-slate-400">
            <Clock className="size-4 flex-shrink-0" />
            <p className="text-xs">No tracking events yet</p>
          </div>
        ) : (
          <div className="relative px-5 pb-5">
            {/* Vertical line */}
            <div className="absolute left-[52px] top-0 bottom-5 w-[1.5px] bg-slate-100 dark:bg-slate-800" />

            <div className="space-y-0">
              {checkpoints.map((cp, i) => {
                const ts = new Date(cp.timestamp);
                const dateStr = ts.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
                const timeStr = ts.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
                const isFirst = i === 0;
                const isDeliveredCp = cp.status === 'Delivered';

                return (
                  <div key={i} className="flex gap-4 relative">
                    {/* Date/time column */}
                    <div className="w-10 flex-shrink-0 text-right pt-1">
                      <p className="text-[9px] font-bold text-slate-500 leading-tight">{dateStr}</p>
                      <p className="text-[9px] text-slate-400 leading-tight">{timeStr}</p>
                    </div>

                    {/* Dot */}
                    <div className="relative flex items-start pt-1 z-10">
                      <div className={cn(
                        'size-3 rounded-full ring-2 flex-shrink-0',
                        isFirst
                          ? isDeliveredCp
                            ? 'bg-green-500 ring-green-500/30'
                            : 'bg-orange-600 ring-orange-600/30'
                          : 'bg-slate-300 dark:bg-slate-600 ring-slate-100 dark:ring-slate-800'
                      )} />
                    </div>

                    {/* Message */}
                    <div className="pb-6 flex-1">
                      {isFirst && (
                        <span className={cn(
                          'inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-1',
                          isDeliveredCp
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-600'
                            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                        )}>
                          {isDeliveredCp ? 'Delivered' : 'Latest Update'}
                        </span>
                      )}
                      <p className={cn(
                        'text-sm font-bold leading-snug',
                        isFirst
                          ? isDeliveredCp ? 'text-green-600' : 'text-orange-600'
                          : 'text-slate-700 dark:text-slate-200'
                      )}>
                        {cp.description || cp.status}
                      </p>
                      {cp.location && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="size-3 flex-shrink-0" />
                          {cp.location}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Shipment info */}
      <div className="mx-4 mt-4 bg-slate-900 dark:bg-slate-800 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-orange-600/10 rounded-full blur-xl" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-white/10 pb-3">
          Shipment Information
        </p>
        <div className="grid grid-cols-2 gap-y-5 gap-x-4">
          <div>
            <p className="text-[9px] text-orange-500 font-black uppercase mb-1">From</p>
            <p className="text-sm font-bold text-white truncate">{delivery.senderName || 'Sender'}</p>
            <p className="text-[10px] text-slate-400">{delivery.origin || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] text-orange-500 font-black uppercase mb-1">To</p>
            <p className="text-sm font-bold text-white truncate">{delivery.receiverName || 'Recipient'}</p>
            <p className="text-[10px] text-slate-400">{delivery.destination || '—'}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Total Fee</p>
            <p className="text-lg font-black text-white">₱{Number(delivery.totalFee || 0).toFixed(2)}</p>
          </div>
          <div>
            <p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Weight</p>
            <p className="text-sm font-bold text-white">{delivery.weight || 0} kg</p>
          </div>
        </div>
        <button className="mt-5 w-full py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-2 text-white">
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
