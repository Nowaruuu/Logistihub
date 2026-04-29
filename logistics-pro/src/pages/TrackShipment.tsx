import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import { Truck, MapPin, Calendar, Package as PackageIcon, Check, ChevronRight, MessageSquare, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

// Error boundary to prevent white-screen crashes
class DetailErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error('TrackShipment render error:', error); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
          <PackageIcon className="size-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Something went wrong</h2>
          <p className="text-slate-500 mt-2 text-center">Could not load shipment details</p>
          <button onClick={() => window.history.back()} className="mt-6 text-orange-600 font-bold">Go Back</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function TrackShipmentInner() {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!trackingNumber) return;

    const fetchDelivery = async () => {
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
            origin: s.pickup_location || '',
            destination: s.dropoff_location || '',
            status: normalizeStatus(s.status),
            estimatedArrival: s.estimated_arrival || 'Calculating...',
            weight: s.weight || 0,
            size: s.size || s.item_type_flag || '',
            shippingMethod: s.shipping_method || 'Standard',
            totalFee: s.total_fee || 0,
            currentLat: s.pickup_lat || 14.5995,
            currentLng: s.pickup_lng || 120.9842,
            destLat: s.dropoff_lat,
            destLng: s.dropoff_lng,
            history: (result.history || []).map((h: any) => ({
              status: h.status || '',
              location: h.location || '',
              timestamp: h.created_at || new Date().toISOString(),
              description: h.description || ''
            })),
            createdAt: s.created_at || new Date().toISOString()
          };
          setDelivery(mapped);
        } else {
          setDelivery(null);
          setError('Shipment not found');
        }
      } catch (err) {
        console.warn('Failed to load delivery:', err);
        setDelivery(null);
        setError('Failed to load shipment');
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
    const interval = setInterval(fetchDelivery, 15000);
    return () => clearInterval(interval);
  }, [trackingNumber]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
      <div className="size-12 rounded-full border-4 border-orange-600 border-t-transparent animate-spin mb-4"></div>
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

  const statusSteps = [
    { status: 'Processing', icon: PackageIcon, label: 'Picked Up' },
    { status: 'In Transit', icon: Truck, label: 'In Transit' },
    { status: 'Out for Delivery', icon: Truck, label: 'Out for Delivery' },
    { status: 'Delivered', icon: Check, label: 'Delivered' },
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.status === delivery.status);
  const progressPercent = Math.max(0, ((currentStatusIndex + 1) / statusSteps.length) * 100);

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-900">
      <header className="flex items-center p-4 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="text-slate-700 dark:text-slate-300 size-6" />
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10 text-slate-900 dark:text-white">Track Shipment</h1>
      </header>

      {/* Tracking number + status */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{delivery.shippingMethod || 'Standard'}</p>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">{delivery.trackingNumber}</h2>
          </div>
          <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm shadow-orange-600/30">
            {(delivery.status || 'Processing').toUpperCase()}
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Calendar className="size-3" />
          Estimated arrival: <span className="font-semibold text-slate-700 dark:text-slate-300">{delivery.estimatedArrival || 'Calculating...'}</span>
        </p>
      </div>

      {/* Route info (instead of map to prevent crash) */}
      <div className="px-5 mb-6">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50">
          <div className="flex items-start gap-4">
            <div className="flex flex-col items-center gap-1 pt-1">
              <div className="size-3 rounded-full bg-orange-600 ring-4 ring-orange-600/20"></div>
              <div className="w-0.5 h-10 bg-gradient-to-b from-orange-600 to-emerald-500"></div>
              <div className="size-3 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20"></div>
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pickup</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{delivery.origin || 'Origin'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Destination</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{delivery.destination || 'Destination'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-5 mb-8">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Delivery Progress</span>
            <span className="text-sm font-black text-orange-600">{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-orange-600 h-full rounded-full shadow-[0_0_10px_rgba(236,91,19,0.3)] transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-3">
            {statusSteps.map((step, i) => (
              <div key={step.status} className="text-center flex-1">
                <div className={cn(
                  "size-8 rounded-full flex items-center justify-center mx-auto mb-1 transition-colors",
                  i <= currentStatusIndex ? "bg-orange-600 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                )}>
                  <step.icon className="size-3.5" />
                </div>
                <p className={cn("text-[8px] font-bold uppercase", i <= currentStatusIndex ? "text-orange-600" : "text-slate-400")}>
                  {step.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History */}
      {delivery.history && delivery.history.length > 0 && (
        <div className="px-5 mb-8">
          <h3 className="font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            Tracking History
            <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
          </h3>
          <div className="space-y-0 relative">
            <div className="absolute left-4 top-4 bottom-4 w-[2px] bg-slate-100 dark:bg-slate-800 z-0"></div>
            {delivery.history.slice().reverse().map((item, i) => (
              <div key={i} className="flex gap-6 relative z-10">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg",
                  i === 0 ? "bg-orange-600 shadow-orange-600/20 scale-110 ring-4 ring-orange-600/5" : "bg-green-500 shadow-green-500/20"
                )}>
                  {i === 0 ? <Truck className="size-4 fill-current" /> : <Check className="size-4" />}
                </div>
                <div className="pb-8">
                  {i === 0 && <div className="inline-block bg-orange-600/10 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded mb-1">CURRENT STATUS</div>}
                  <p className={cn("font-bold text-sm", i === 0 ? "text-orange-600" : "text-slate-800 dark:text-slate-200")}>{item.status || 'Update'}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {item.location ? `${item.location} • ` : ''}{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}
                  </p>
                  {item.description && <p className="text-xs text-slate-400 mt-1">{item.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipment info card */}
      <div className="px-5 pb-24">
        <div className="bg-slate-900 text-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-600/10 rounded-full blur-2xl"></div>
          <h3 className="font-bold text-xs uppercase tracking-widest mb-5 text-slate-400 border-b border-white/10 pb-3">Shipment Information</h3>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-[9px] text-orange-600 font-black uppercase tracking-tighter mb-1">From</p>
              <p className="text-sm font-bold truncate">{delivery.senderName || 'Sender'}</p>
              <p className="text-[10px] text-slate-400">{delivery.origin || 'Origin'}</p>
            </div>
            <div>
              <p className="text-[9px] text-orange-600 font-black uppercase tracking-tighter mb-1">To</p>
              <p className="text-sm font-bold truncate">{delivery.receiverName || 'Recipient'}</p>
              <p className="text-[10px] text-slate-400">{delivery.destination || 'Destination'}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Total Fee</p>
              <p className="text-lg font-black text-white">₱ {(delivery.totalFee || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Weight</p>
              <p className="text-sm font-bold">{delivery.weight || 0} kg</p>
            </div>
          </div>
          <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-2">
            <MessageSquare className="size-4" />
            Contact Support
          </button>
        </div>
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
