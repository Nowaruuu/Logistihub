import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import {
  Search, Truck, Package as PackageIcon, ChevronRight,
  CheckCircle, Clock, CreditCard, Star, MapPin, Box
} from 'lucide-react';
import { createCheckout } from '../lib/api';
import { cn } from '../lib/utils';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

// ── In-app PayMongo Payment ────────────────────────────────────────────────────
async function openPaymentInApp(
  checkoutUrl: string,
  deliveryNumber: string,
  onSuccess: () => void,
  onClose: () => void,
  existingPopup?: Window | null
) {
  const slug  = localStorage.getItem('auth_slug')  || '';
  const token = localStorage.getItem('auth_token') || '';
  const statusUrl = `https://logistichub.ddns.net/${slug}/api/mobile/pay/status/${deliveryNumber}`;

  const checkPaid = async (): Promise<boolean> => {
    try {
      const r = await fetch(statusUrl, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      return d.status === 'Paid' || d.status === 'paid';
    } catch (_) { return false; }
  };

  const pollStatus = (stopFn: () => void) => {
    let count = 0;
    const id = setInterval(async () => {
      count++;
      if (count > 40) { clearInterval(id); return; }
      if (await checkPaid()) { clearInterval(id); stopFn(); onSuccess(); }
    }, 3000);
    return id;
  };

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: checkoutUrl, presentationStyle: 'popover' });
    let pollId: ReturnType<typeof setInterval>;
    const listener = await Browser.addListener('browserFinished', async () => {
      clearInterval(pollId);
      listener.remove();
      if (await checkPaid()) { onSuccess(); return; }
      onClose();
    });
    pollId = pollStatus(() => { Browser.close().catch(() => {}); listener.remove(); });
    return;
  }

  const popup = existingPopup ?? window.open(checkoutUrl, 'paymongo_checkout', 'width=520,height=720,top=50,left=50,scrollbars=yes');
  if (existingPopup) { try { existingPopup.location.href = checkoutUrl; } catch (_) {} }
  if (!popup) { window.location.href = checkoutUrl; return; }

  let pollId: ReturnType<typeof setInterval>;
  const closePoll = setInterval(async () => {
    if (popup.closed) {
      clearInterval(closePoll); clearInterval(pollId);
      if (await checkPaid()) { onSuccess(); return; }
      onClose();
    }
  }, 500);
  pollId = pollStatus(() => { clearInterval(closePoll); popup.close(); });
}

// ── Tab definitions ────────────────────────────────────────────────────────────
type TabId = 'topay' | 'toship' | 'toreceive' | 'torate';

const TABS: { id: TabId; label: string; icon: React.ElementType; emptyMsg: string }[] = [
  { id: 'topay',     label: 'To Pay',     icon: CreditCard, emptyMsg: 'No unpaid shipments'         },
  { id: 'toship',    label: 'To Ship',    icon: Box,        emptyMsg: 'No shipments awaiting pickup' },
  { id: 'toreceive', label: 'To Receive', icon: Truck,      emptyMsg: 'No shipments in transit'      },
  { id: 'torate',    label: 'Completed',  icon: Star,       emptyMsg: 'No completed deliveries yet'  },
];

function getTab(d: Delivery): TabId {
  const s = d.status || '';
  if (s === 'Delivered') return 'torate';
  if (['In Transit', 'Out for Delivery'].includes(s)) return 'toreceive';
  if (d.isPaid) return 'toship'; // paid, but not yet picked up
  return 'topay'; // unpaid
}

// ── Error boundary ─────────────────────────────────────────────────────────────
class PackagesErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean; errorMsg: string}> {
  constructor(props: any) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(err: any) { return { hasError: true, errorMsg: String(err) }; }
  componentDidCatch(error: any, info: any) { console.error('MyPackages crash:', error, info); }
  render() {
    if (this.state.hasError) return (
      <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
        <PackageIcon className="size-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Page Error</h2>
        <p className="text-slate-500 mt-2 text-sm text-center">{this.state.errorMsg}</p>
        <button onClick={() => this.setState({ hasError: false })} className="mt-4 px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl text-sm">Retry</button>
      </div>
    );
    return this.props.children;
  }
}

// ── Main component ─────────────────────────────────────────────────────────────
function MyPackagesInner() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('topay');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const navigate = useNavigate();

  const isDriver = profile?.role === 'driver';

  const fetchDeliveries = useCallback(async () => {
    try {
      const docs = isDriver
        ? await deliveryService.getDriverDeliveries()
        : await deliveryService.getAllDeliveries();
      setDeliveries(docs || []);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  }, [isDriver]);

  useEffect(() => {
    if (!user) return;
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 30000);
    return () => clearInterval(interval);
  }, [user, fetchDeliveries]);

  const filtered = deliveries.filter(d => {
    if (!d) return false;
    const q = searchQuery.toLowerCase();
    return (d.trackingNumber || '').toLowerCase().includes(q)
        || (d.origin || '').toLowerCase().includes(q)
        || (d.destination || '').toLowerCase().includes(q);
  });

  // Count per tab for badges
  const counts = filtered.reduce((acc, d) => {
    const t = getTab(d); acc[t] = (acc[t] || 0) + 1; return acc;
  }, {} as Record<TabId, number>);

  const displayed = filtered.filter(d => getTab(d) === activeTab);

  // ── Pay Now handler ──────────────────────────────────────────────────────────
  const handlePayNow = async (e: React.MouseEvent, delivery: Delivery) => {
    e.stopPropagation();
    const tn = delivery.trackingNumber || '';
    if (paying === tn) return;
    setPaying(tn);

    const prePopup = !Capacitor.isNativePlatform()
      ? window.open('', 'paymongo_checkout', 'width=520,height=720,top=50,left=50,scrollbars=yes')
      : null;

    try {
      const r = await createCheckout(tn, Number(delivery.totalFee || 0), `Shipment ${tn}`);
      if (r?.already_paid) {
        prePopup?.close();
        setDeliveries(prev => prev.map(d => d.trackingNumber === tn ? { ...d, isPaid: true } : d));
        setPaying(null);
      } else if (r?.checkout_url) {
        await openPaymentInApp(
          r.checkout_url, tn,
          () => {
            setDeliveries(prev => prev.map(d => d.trackingNumber === tn ? { ...d, isPaid: true } : d));
            setPaying(null);
            fetchDeliveries();
          },
          () => setPaying(null),
          prePopup
        );
      } else {
        prePopup?.close();
        alert('Payment gateway not available.');
        setPaying(null);
      }
    } catch (err: any) {
      prePopup?.close();
      alert('Payment failed: ' + (err?.message || 'Unknown error'));
      setPaying(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
      <div className="size-12 rounded-full border-4 border-orange-600 border-t-transparent animate-spin mb-4" />
      <p className="text-slate-500 text-sm">Loading packages...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-900">

      {/* ── 4-Tab Bar (Shopee style) ── */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const count  = counts[tab.id] || 0;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-3 gap-1 border-b-2 transition-all relative',
                  active
                    ? 'border-orange-600 text-orange-600'
                    : 'border-transparent text-slate-400 dark:text-slate-500'
                )}
              >
                <div className="relative">
                  <Icon className="size-4" />
                  {count > 0 && (
                    <span className={cn(
                      'absolute -top-2 -right-2.5 min-w-[14px] h-[14px] rounded-full text-[9px] font-black flex items-center justify-center px-0.5',
                      active ? 'bg-orange-600 text-white' : 'bg-slate-300 dark:bg-slate-600 text-slate-600 dark:text-slate-300'
                    )}>
                      {count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Search ── */}
      <div className="px-5 pt-4 pb-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-orange-600 transition-colors size-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 transition-all"
            placeholder="Search tracking number or location..."
          />
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 px-4 pb-24 space-y-3 pt-2">
        {displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            {(() => { const T = TABS.find(t => t.id === activeTab)!; const Icon = T.icon; return (
              <>
                <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Icon className="size-7 text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm font-medium">{T.emptyMsg}</p>
              </>
            );})()}
          </div>
        )}

        {displayed.map((delivery, idx) => (
          <DeliveryCard
            key={delivery.id || `${activeTab}-${idx}`}
            delivery={delivery}
            tab={activeTab}
            paying={paying}
            onPay={handlePayNow}
            onClick={() => delivery.trackingNumber && navigate(`/track/${delivery.trackingNumber}`)}
          />
        ))}
      </div>
    </div>
  );
}

// ── Delivery Card ──────────────────────────────────────────────────────────────
function DeliveryCard({
  delivery, tab, paying, onPay, onClick
}: {
  delivery: Delivery;
  tab: TabId;
  paying: string | null;
  onPay: (e: React.MouseEvent, d: Delivery) => void;
  onClick: () => void;
}) {
  const tn  = delivery.trackingNumber || '';
  const fee = Number(delivery.totalFee || 0).toFixed(2);
  const isLoading = paying === tn;

  // Status badge color
  const statusColor: Record<string, string> = {
    'Processing':       'bg-slate-100 dark:bg-slate-700 text-slate-500',
    'In Transit':       'bg-blue-50 dark:bg-blue-900/30 text-blue-600',
    'Out for Delivery': 'bg-amber-50 dark:bg-amber-900/30 text-amber-600',
    'Delivered':        'bg-green-50 dark:bg-green-900/30 text-green-600',
    'Pending':          'bg-slate-100 dark:bg-slate-700 text-slate-500',
  };

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800/50 shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-all hover:border-orange-200 dark:hover:border-orange-900/40"
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className={cn(
          'size-11 rounded-xl flex items-center justify-center shrink-0',
          tab === 'topay'     ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
          tab === 'toship'    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' :
          tab === 'toreceive' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-500' :
                                'bg-green-50 dark:bg-green-900/20 text-green-500'
        )}>
          {tab === 'topay'     ? <CreditCard className="size-5" /> :
           tab === 'toship'    ? <Box className="size-5" /> :
           tab === 'toreceive' ? <Truck className="size-5" /> :
                                 <Star className="size-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">#{tn || 'N/A'}</p>
            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', statusColor[delivery.status || ''] || statusColor['Processing'])}>
              {delivery.status || 'Processing'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <MapPin className="size-3 text-slate-400 shrink-0" />
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{delivery.destination || 'N/A'}</p>
          </div>
        </div>

        <ChevronRight className="size-4 text-slate-300 shrink-0" />
      </div>

      {/* Divider + fee row */}
      <div className="border-t border-slate-50 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs text-slate-400">Shipping fee</span>
        <span className="text-sm font-extrabold text-orange-600">₱{fee}</span>
      </div>

      {/* ── Action area ── */}
      {tab === 'topay' && (
        <div className="px-4 pb-4 pt-1">
          <button
            onClick={e => onPay(e, delivery)}
            disabled={isLoading}
            className="w-full py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50 shadow-sm shadow-orange-200 dark:shadow-none"
          >
            <CreditCard className="size-3.5" />
            {isLoading ? 'Opening payment...' : `Pay Now • ₱${fee}`}
          </button>
        </div>
      )}

      {tab === 'toship' && (
        <div className="px-4 pb-4 pt-1">
          <div className="w-full py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 text-amber-600 text-xs font-bold flex items-center justify-center gap-2">
            <CheckCircle className="size-3.5" />
            Paid · Waiting for Pickup
          </div>
        </div>
      )}

      {tab === 'toreceive' && (
        <div className="px-4 pb-4 pt-1">
          {/* Progress bar */}
          <div className="flex items-center justify-between gap-1 mb-2">
            {['Received','In Transit','Out for Delivery','Arriving'].map((step, i) => {
              const steps = ['Processing','In Transit','Out for Delivery','Delivered'];
              const currentIdx = steps.indexOf(delivery.status || '');
              const done = i <= currentIdx;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-0.5">
                    <div className={cn('size-2 rounded-full transition-colors', done ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700')} />
                    <span className="text-[8px] text-slate-400 font-medium">{step}</span>
                  </div>
                  {i < 3 && <div className={cn('flex-1 h-px mb-3 transition-colors', done && i < currentIdx ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700')} />}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'torate' && (
        <div className="px-4 pb-4 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-green-600">
              <CheckCircle className="size-3.5" />
              <span className="text-xs font-bold">Successfully Delivered</span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); }}
              className="text-[11px] font-bold text-orange-600 border border-orange-200 dark:border-orange-800 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
            >
              ★ Rate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyPackages() {
  return (
    <PackagesErrorBoundary>
      <MyPackagesInner />
    </PackagesErrorBoundary>
  );
}
