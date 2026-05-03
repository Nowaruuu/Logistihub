import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MapPin, Navigation, Truck, Bolt, ArrowRight, Map as MapIcon, User, Phone, Package, Car, UtensilsCrossed, FileText, Boxes, Search, Loader2, CheckCircle2, Crosshair, Bike, AlertTriangle, Fuel, Shield, ShieldCheck, CalendarDays, NotebookPen, X } from 'lucide-react';
import { cn } from '../lib/utils';
import Map, { DestinationIcon } from '../components/Map';
import { deliveryService } from '../services/deliveryService';
import { getTenantConfig } from '../lib/api';
import { Geolocation } from '@capacitor/geolocation';

// Category types matching database item_type_flag
const PACKAGE_CATEGORIES = [
  { id: 'PACKAGE', label: 'Standard Package', icon: Package, desc: 'Boxes, parcels, envelopes' },
  { id: 'VEHICLE', label: 'Vehicle', icon: Car, desc: 'Cars, motorcycles, heavy equipment' },
  { id: 'FOOD', label: 'Food', icon: UtensilsCrossed, desc: 'Perishable goods, catering' },
  { id: 'DOC', label: 'Document', icon: FileText, desc: 'Legal papers, contracts, IDs' },
  { id: 'BULK', label: 'Bulk Freight', icon: Boxes, desc: 'Pallets, wholesale cargo' },
] as const;

// Vehicle types with REAL Philippine fuel rates
// Based on: Gasoline ~₱61/L, Diesel ~₱55/L (as of 2025)
// Fuel cost per km = price_per_liter ÷ km_per_liter
const VEHICLE_TYPES = [
  // Motorcycle: ~35 km/L gasoline → ₱61/35 = ₱1.74/km + driver labor → ~₱2.20/km
  { id: 'motorcycle', label: 'Motorcycle', icon: Bike, maxKg: 20, fuelRate: 2.20, desc: 'Small parcels, documents', fuelType: 'Gasoline' },
  // Sedan: ~13 km/L gasoline → ₱61/13 = ₱4.69/km
  { id: 'sedan', label: 'Sedan', icon: Car, maxKg: 100, fuelRate: 4.70, desc: 'Medium packages', fuelType: 'Gasoline' },
  // Van: ~9 km/L diesel → ₱55/9 = ₱6.11/km
  { id: 'van', label: 'Van', icon: Truck, maxKg: 500, fuelRate: 6.11, desc: 'Multiple boxes, food', fuelType: 'Diesel' },
  // Truck: ~5 km/L diesel → ₱55/5 = ₱11/km
  { id: 'truck', label: 'Truck', icon: Truck, maxKg: 5000, fuelRate: 11.00, desc: 'Heavy cargo, pallets', fuelType: 'Diesel' },
  // Flatbed: ~3.5 km/L diesel → ₱55/3.5 = ₱15.71/km
  { id: 'flatbed', label: 'Flatbed', icon: Truck, maxKg: 20000, fuelRate: 15.71, desc: 'Vehicles, heavy equipment', fuelType: 'Diesel' },
] as const;

// Which vehicles are compatible with each category
const CATEGORY_VEHICLES: Record<string, string[]> = {
  PACKAGE: ['motorcycle', 'sedan', 'van'],
  VEHICLE: ['flatbed', 'truck'],
  FOOD: ['motorcycle', 'sedan', 'van'],
  DOC: ['motorcycle', 'sedan'],
  BULK: ['truck', 'flatbed'],
};

// Why a vehicle is incompatible with a category
const INCOMPATIBLE_REASONS: Record<string, Record<string, string>> = {
  BULK: { motorcycle: 'Too small for bulk freight', sedan: 'Cannot fit pallets/wholesale cargo', van: 'Insufficient capacity for bulk' },
  VEHICLE: { motorcycle: 'Cannot transport vehicles', sedan: 'Cannot carry heavy equipment', van: 'Insufficient for vehicle transport' },
  DOC: { truck: 'Overkill for documents', flatbed: 'Overkill for documents', van: 'Unnecessary for small docs' },
  FOOD: { truck: 'Not suited for food delivery', flatbed: 'Not suited for food delivery' },
  PACKAGE: { truck: 'Oversized for standard parcels', flatbed: 'Oversized for standard parcels' },
};

// Nominatim address search (free, no API key)
async function searchAddress(query: string): Promise<Array<{ display_name: string; lat: string; lon: string }>> {
  if (!query || query.length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5`,
    { headers: { 'Accept-Language': 'en' } }
  );
  return res.json();
}

// Reverse geocode coords to address
async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
    { headers: { 'Accept-Language': 'en' } }
  );
  const data = await res.json();
  return data.display_name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

// Get actual road distance using OSRM (free, no API key)
async function getRouteDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<{ distKm: number; durationMin: number }> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`
    );
    const data = await res.json();
    if (data.routes && data.routes.length > 0) {
      return {
        distKm: data.routes[0].distance / 1000,
        durationMin: data.routes[0].duration / 60,
      };
    }
  } catch (e) { console.warn('OSRM fallback to Haversine:', e); }
  // Fallback to Haversine
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return { distKm: dist, durationMin: dist / 0.5 }; // rough estimate
}

export default function SendPackage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>([14.5489, 121.0486]);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [pickupNotes, setPickupNotes] = useState('');
  const [destNotes, setDestNotes] = useState('');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'ton'>('kg');
  const [category, setCategory] = useState('PACKAGE');
  const [method, setMethod] = useState<'standard' | 'express'>('standard');
  const [scheduledDate, setScheduledDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showPickupMap, setShowPickupMap] = useState(false);

  // Address search state
  const [pickupResults, setPickupResults] = useState<any[]>([]);
  const [destResults, setDestResults] = useState<any[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const pickupTimer = useRef<ReturnType<typeof setTimeout>>();
  const destTimer = useRef<ReturnType<typeof setTimeout>>();

  // Tenant-configured vehicles (fetched from backend)
  const [tenantVehicles, setTenantVehicles] = useState<string[]>(['motorcycle','sedan','van','truck','flatbed']);
  // Staff-managed vehicle capacities (kg) — overrides hardcoded maxKg
  const [tenantCapacities, setTenantCapacities] = useState<Record<string, number>>({});
  // Globally enabled package categories (admin-controlled)
  // Map: DB label → component id
  const CAT_LABEL_TO_ID: Record<string, string> = {
    Package: 'PACKAGE', Food: 'FOOD', Document: 'DOC', Bulk: 'BULK', Vehicle: 'VEHICLE',
  };
  const [enabledCatIds, setEnabledCatIds] = useState<string[]>(['PACKAGE','VEHICLE','FOOD','DOC','BULK']);

  // Live-refresh tenant config: on mount, on visibility change, and every 30s
  useEffect(() => {
    const refreshConfig = () => {
      getTenantConfig().then(cfg => {
        setTenantVehicles(cfg.available_vehicles);
        if (cfg.vehicle_capacities) setTenantCapacities(cfg.vehicle_capacities);
        if (cfg.supported_categories) {
          setEnabledCatIds(cfg.supported_categories.map((l: string) => CAT_LABEL_TO_ID[l]).filter(Boolean));
        }
      }).catch(() => {});
    };

    // Fetch immediately
    refreshConfig();

    // Re-fetch when page/app becomes visible (tab switch, app foreground)
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshConfig(); };
    document.addEventListener('visibilitychange', onVisibility);

    // Poll every 30 seconds for near-real-time updates
    const interval = setInterval(refreshConfig, 15_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, []);

  // All categories shown, but disabled ones are marked
  const isCategoryEnabled = (id: string) => enabledCatIds.includes(id);

  // Auto-reset selection if current category gets disabled
  useEffect(() => {
    if (!isCategoryEnabled(category) && enabledCatIds.length > 0) {
      const firstEnabled = PACKAGE_CATEGORIES.find(c => enabledCatIds.includes(c.id));
      if (firstEnabled) setCategory(firstEnabled.id);
    }
  }, [enabledCatIds, category]);

  // Extra safety / insurance toggle
  const [extraSafety, setExtraSafety] = useState(false);
  const SAFETY_FEE = 150; // ₱150 flat insurance surcharge

  // Vehicle selection state
  const [vehicle, setVehicle] = useState('sedan');
  // Compatible = category rules ∩ tenant fleet
  const categoryAllowed = CATEGORY_VEHICLES[category] || ['sedan'];
  const compatibleVehicles = categoryAllowed.filter(v => tenantVehicles.includes(v));

  // OSRM route state
  const [routeDistKm, setRouteDistKm] = useState(0);
  const [routeDurationMin, setRouteDurationMin] = useState(0);
  const [fetchingRoute, setFetchingRoute] = useState(false);

  // GPS loading
  const [gpsLoadingPickup, setGpsLoadingPickup] = useState(false);
  const [gpsLoadingDest, setGpsLoadingDest] = useState(false);

  // Auto-select first compatible vehicle when category changes
  useEffect(() => {
    const compat = CATEGORY_VEHICLES[category] || ['sedan'];
    if (!compat.includes(vehicle)) {
      setVehicle(compat[0]);
    }
  }, [category]);

  // Fetch OSRM route when both coords are set
  useEffect(() => {
    if (!pickupCoords || !destCoords) { setRouteDistKm(0); setRouteDurationMin(0); return; }
    let cancelled = false;
    setFetchingRoute(true);
    getRouteDistance(pickupCoords[0], pickupCoords[1], destCoords[0], destCoords[1])
      .then(({ distKm, durationMin }) => {
        if (!cancelled) { setRouteDistKm(distKm); setRouteDurationMin(durationMin); }
      })
      .finally(() => { if (!cancelled) setFetchingRoute(false); });
    return () => { cancelled = true; };
  }, [pickupCoords, destCoords]);

  // Use current GPS location
  const useCurrentLocation = async (target: 'pickup' | 'dest') => {
    const setLoading = target === 'pickup' ? setGpsLoadingPickup : setGpsLoadingDest;
    setLoading(true);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const addr = await reverseGeocode(lat, lon);
      if (target === 'pickup') {
        setPickup(addr);
        setPickupCoords([lat, lon]);
        setShowPickupMap(true);
      } else {
        setDestination(addr);
        setDestCoords([lat, lon]);
        setShowMap(true);
      }
    } catch (e: any) {
      console.error('GPS error:', e);
      setError('Could not get location. Please enable GPS.');
    }
    setLoading(false);
  };

  // Convert weight to kg for pricing
  const rawWeight = parseFloat(weight) || 0;
  const weightKg = weightUnit === 'ton' ? rawWeight * 1000 : rawWeight;
  const distKm = routeDistKm;

  // Gas estimation pricing: base + fuel cost + weight surcharge + category surcharge
  // Fuel cost = road distance × vehicle fuel rate (₱/km)
  const selectedVehicle = VEHICLE_TYPES.find(v => v.id === vehicle);
  const fuelRate = selectedVehicle?.fuelRate || 5;
  const fuelCost = distKm * fuelRate;
  const tierRate = weightKg <= 50 ? weightKg * 1 : weightKg <= 500 ? 50 + (weightKg - 50) * 0.80 : 50 + 360 + (weightKg - 500) * 0.50;
  const categorySurcharge = category === 'VEHICLE' ? 800 : category === 'BULK' ? 300 : category === 'FOOD' ? 50 : 0;
  const safetySurcharge = extraSafety ? SAFETY_FEE : 0;
  const baseFee = 50 + fuelCost + tierRate + categorySurcharge + safetySurcharge;
  // Express = 1.8× base (consistent in both display & totalFee)
  const totalFee = Math.round(method === 'standard' ? baseFee : baseFee * 1.8);

  // Check if a date is Sunday
  const isSunday = (dateStr: string) => {
    if (!dateStr) return new Date().getDay() === 0;
    return new Date(dateStr).getDay() === 0;
  };

  // Auto-switch to standard if user picks Sunday while on express
  // REMOVED: Express is still selectable on Sundays — orders will be delivered next business day

  // Today's date for min picker
  const todayStr = new Date().toISOString().split('T')[0];
  const isTodaySunday = new Date().getDay() === 0;
  const isSelectedSunday = scheduledDate ? new Date(scheduledDate).getDay() === 0 : isTodaySunday;

  // Delivery ETA descriptions
  const stdEta = '3-7 business days';
  const expEta = 'Same day delivery';

  // Debounced address search for pickup — ALWAYS updates coords, no guard
  const handlePickupChange = (val: string) => {
    setPickup(val);
    if (pickupTimer.current) clearTimeout(pickupTimer.current);
    if (val.length >= 3) {
      setSearchingPickup(true);
      pickupTimer.current = setTimeout(async () => {
        const results = await searchAddress(val);
        setPickupResults(results);
        setSearchingPickup(false);
        // Always pin first result — update even if coords already set
        if (results.length > 0) {
          setPickupCoords([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
        }
      }, 500);
    } else {
      setPickupResults([]);
      setSearchingPickup(false);
    }
  };

  // Force-search and pin on blur — catches the case where user typed and walked away
  const handlePickupBlur = async () => {
    setTimeout(async () => {
      if (pickup.length >= 3) {
        if (pickupResults.length > 0) {
          // Results already loaded — just pin the top one
          setPickupCoords([parseFloat(pickupResults[0].lat), parseFloat(pickupResults[0].lon)]);
          setPickup(pickupResults[0].display_name);
          setPickupResults([]);
        } else {
          // No results yet — force search now
          const results = await searchAddress(pickup);
          if (results.length > 0) {
            setPickupCoords([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
            setPickup(results[0].display_name);
          }
          setPickupResults([]);
        }
      }
    }, 200); // small delay so tap-on-suggestion still fires first
  };

  // Debounced address search for destination — ALWAYS updates coords
  const handleDestChange = (val: string) => {
    setDestination(val);
    if (destTimer.current) clearTimeout(destTimer.current);
    if (val.length >= 3) {
      setSearchingDest(true);
      destTimer.current = setTimeout(async () => {
        const results = await searchAddress(val);
        setDestResults(results);
        setSearchingDest(false);
        // Always pin first result
        if (results.length > 0) {
          setDestCoords([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
        }
      }, 500);
    } else {
      setDestResults([]);
      setSearchingDest(false);
    }
  };

  // Force-search and pin on blur for destination
  const handleDestBlur = async () => {
    setTimeout(async () => {
      if (destination.length >= 3) {
        if (destResults.length > 0) {
          setDestCoords([parseFloat(destResults[0].lat), parseFloat(destResults[0].lon)]);
          setDestination(destResults[0].display_name);
          setDestResults([]);
        } else {
          const results = await searchAddress(destination);
          if (results.length > 0) {
            setDestCoords([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
            setDestination(results[0].display_name);
          }
          setDestResults([]);
        }
      }
    }, 200);
  };

  const selectPickup = (result: any) => {
    setPickup(result.display_name);
    setPickupCoords([parseFloat(result.lat), parseFloat(result.lon)]);
    setPickupResults([]);
    setShowPickupMap(true);
  };

  const selectDest = (result: any) => {
    setDestination(result.display_name);
    setDestCoords([parseFloat(result.lat), parseFloat(result.lon)]);
    setDestResults([]);
    setShowMap(true);
  };

  const handleConfirm = async () => {
    // Validate ALL required fields
    if (!user) return;
    if (!pickup.trim()) { setError('Pickup address is required'); return; }
    if (!destination.trim()) { setError('Destination address is required'); return; }
    if (!receiverName.trim()) { setError('Receiver name is required'); return; }
    if (!receiverPhone.trim()) { setError('Receiver phone number is required'); return; }
    if (!weight || rawWeight <= 0) { setError('Weight must be greater than 0'); return; }
    if (compatibleVehicles.length === 0) { setError('No suitable vehicle available for this package category. Please choose a different category or contact your admin.'); return; }
    setLoading(true);
    setError('');
    try {
      const finalOriginLat = pickupCoords ? pickupCoords[0] : 14.5489;
      const finalOriginLng = pickupCoords ? pickupCoords[1] : 121.0486;
      const finalDestLat = destCoords ? destCoords[0] : 14.5 + Math.random() * 0.2;
      const finalDestLng = destCoords ? destCoords[1] : 120.9 + Math.random() * 0.2;

      const deliveryNumber = await deliveryService.createDelivery({
        senderUid: user.uid,
        senderName: profile?.fullName || user.email,
        receiverName,
        receiverPhone,
        origin: pickupNotes ? `${pickup} — ${pickupNotes}` : pickup,
        destination: destNotes ? `${destination} — ${destNotes}` : destination,
        estimatedArrival: method === 'standard' ? stdEta : expEta,
        weight: weightKg,
        size: PACKAGE_CATEGORIES.find(c => c.id === category)?.label || 'Standard Package',
        shippingMethod: method === 'standard' ? 'Standard Delivery' : 'Express Delivery',
        totalFee,
        originLat: finalOriginLat,
        originLng: finalOriginLng,
        destLat: finalDestLat,
        destLng: finalDestLng,
        item_type_flag: category,
        scheduled_date: scheduledDate || todayStr,
      });

      // Success — show success screen, then navigate to packages so user can pay via Pay Now button
      setSubmitted(true);
      setTimeout(() => navigate('/packages'), 2000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create shipment');
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setDestCoords([lat, lng]);
  };

  const handlePickupMapClick = (lat: number, lng: number) => {
    setPickupCoords([lat, lng]);
  };

  // ── Submitted Success Screen ──
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-8 py-20 text-center bg-white dark:bg-slate-900">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="size-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">Shipment Created!</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-4">
          Your shipment has been submitted and is now <strong className="text-orange-500">Processing</strong>. 
          Our team will review the details and assign a driver shortly.
        </p>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 w-full max-w-sm border border-slate-100 dark:border-slate-700 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Status</span>
            <span className="font-bold text-orange-500">Pending Review</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Category</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{PACKAGE_CATEGORIES.find(c => c.id === category)?.label}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Estimated Fee</span>
            <span className="font-bold text-slate-900 dark:text-white">₱{totalFee.toLocaleString()}.00</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-6">Redirecting to My Packages...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-900">
      {/* Step Indicator */}
      <div className="flex w-full flex-row items-center justify-center gap-2.5 py-5 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800/50">
        <div className="h-1.5 w-8 rounded-full bg-orange-600 shadow-sm shadow-orange-600/30"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
      </div>

      <div className="px-5 pt-7 pb-4">
        <h2 className="text-2xl font-extrabold tracking-tight mb-1 text-slate-900 dark:text-white">Package Details</h2>
        <p className="text-[15px] text-slate-500 dark:text-slate-400">Where and what are you sending today?</p>
      </div>

      <section className="px-5 space-y-5">
        {/* ── Pickup Address with Auto-search ── */}
        <div className="group relative">
          <div className="flex items-center justify-between mb-2 ml-1">
            <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pickup Address</label>
            <div className="flex gap-1.5">
              <button 
                type="button"
                onClick={() => useCurrentLocation('pickup')}
                disabled={gpsLoadingPickup}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 active:scale-95"
              >
                {gpsLoadingPickup ? <Loader2 className="size-3 animate-spin" /> : <Crosshair className="size-3" />}
                {gpsLoadingPickup ? 'Getting...' : 'My Location'}
              </button>
              <button 
                type="button"
                onClick={() => setShowPickupMap(!showPickupMap)}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all",
                  showPickupMap ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}
              >
                <MapIcon className="size-3" />
                {showPickupMap ? 'Hide Map' : 'Pin on Map'}
              </button>
            </div>
          </div>
          <div className="relative flex items-center mb-1">
            <MapPin className="absolute left-4 text-orange-600 size-5 z-10" />
            {searchingPickup && <Loader2 className="absolute right-12 text-orange-600 size-4 animate-spin z-10" />}
            {pickup.length > 0 && (
              <button type="button" onClick={() => { setPickup(''); setPickupCoords(null); setPickupResults([]); }} className="absolute right-4 z-10 p-1 rounded-full bg-slate-200 dark:bg-slate-700 active:scale-90 transition-all">
                <X className="size-3 text-slate-500" />
              </button>
            )}
            <input 
              type="text"
              value={pickup}
              onChange={(e) => handlePickupChange(e.target.value)}
              onBlur={() => setTimeout(() => setPickupResults([]), 200)}
              className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100" 
              placeholder="Search address or type manually" 
            />
          </div>
          {/* Search + suggestions wrapper - must be above map */}
          <div className="relative z-50">
          {/* Pickup address suggestions */}
          {pickupResults.length > 0 && (
            <div className="absolute z-[9999] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto mt-1">
              {pickupResults.map((r, i) => (
                <button key={i} onClick={() => selectPickup(r)} className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 transition-colors">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{r.display_name}</p>
                </button>
              ))}
            </div>
          )}
          </div>

          {showPickupMap && (
            <div className="relative z-0 w-full h-64 rounded-2xl overflow-hidden border-2 border-orange-600/20 shadow-inner mb-4 mt-2">
              <Map 
                center={pickupCoords || [14.5489, 121.0486]} 
                zoom={14}
                onClick={handlePickupMapClick}
                markers={pickupCoords ? [{
                  position: pickupCoords,
                  label: 'Pickup Pin',
                  icon: DestinationIcon
                }] : []}
              />
              <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="size-2 bg-orange-600 rounded-full animate-pulse" />
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {pickupCoords ? 'Pickup location pinned!' : 'Tap anywhere to pin exact pickup location'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pickup address details */}
          <div className="relative mt-2">
            <NotebookPen className="absolute left-3 top-3 text-slate-400 size-4" />
            <input
              type="text"
              value={pickupNotes}
              onChange={e => setPickupNotes(e.target.value)}
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              placeholder="Exact address details (e.g. Blk 5 Lot 7)"
            />
          </div>
        </div>

        {/* ── Destination Address with Auto-search ── */}
        <div className="group relative">
          <div className="flex items-center justify-between mb-2 ml-1">
            <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Destination Address</label>
            <div className="flex gap-1.5">
              <button 
                type="button"
                onClick={() => useCurrentLocation('dest')}
                disabled={gpsLoadingDest}
                className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 active:scale-95"
              >
                {gpsLoadingDest ? <Loader2 className="size-3 animate-spin" /> : <Crosshair className="size-3" />}
                {gpsLoadingDest ? 'Getting...' : 'My Location'}
              </button>
              <button 
                type="button"
                onClick={() => setShowMap(!showMap)}
                className={cn(
                  "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all",
                  showMap ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                )}
              >
                <MapIcon className="size-3" />
                {showMap ? 'Hide Map' : 'Pin on Map'}
              </button>
            </div>
          </div>
          <div className="relative flex items-center mb-1">
            <Navigation className="absolute left-4 text-slate-400 size-5 z-10" />
            {searchingDest && <Loader2 className="absolute right-12 text-orange-600 size-4 animate-spin z-10" />}
            {destination.length > 0 && (
              <button type="button" onClick={() => { setDestination(''); setDestCoords(null); setDestResults([]); }} className="absolute right-4 z-10 p-1 rounded-full bg-slate-200 dark:bg-slate-700 active:scale-90 transition-all">
                <X className="size-3 text-slate-500" />
              </button>
            )}
            <input 
              type="text"
              required
              value={destination}
              onChange={(e) => handleDestChange(e.target.value)}
              onBlur={handleDestBlur}
              className="w-full pl-12 pr-12 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100" 
              placeholder="Search receiver's address" 
            />
          </div>
          {/* Search + suggestions wrapper - must be above map */}
          <div className="relative z-50">
          {/* Destination address suggestions */}
          {destResults.length > 0 && (
            <div className="absolute z-[9999] left-0 right-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto mt-1">
              {destResults.map((r, i) => (
                <button key={i} onClick={() => selectDest(r)} className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 transition-colors">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{r.display_name}</p>
                </button>
              ))}
            </div>
          )}
          </div>

          {showMap && (
            <div className="relative z-0 w-full h-64 rounded-2xl overflow-hidden border-2 border-orange-600/20 shadow-inner mb-4 mt-2">
              <Map 
                center={destCoords || [14.5489, 121.0486]} 
                zoom={14}
                onClick={handleMapClick}
                markers={destCoords ? [{
                  position: destCoords,
                  label: 'Delivery Pin',
                  icon: DestinationIcon
                }] : []}
              />
              <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="size-2 bg-orange-600 rounded-full animate-pulse" />
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {destCoords ? 'Location pinned!' : 'Tap anywhere to pin exact location'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Destination address details */}
          <div className="relative mt-2">
            <NotebookPen className="absolute left-3 top-3 text-slate-400 size-4" />
            <input
              type="text"
              value={destNotes}
              onChange={e => setDestNotes(e.target.value)}
              className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              placeholder="Exact address details (e.g. Unit 4B, near 7-Eleven)"
            />
          </div>
        </div>

        {/* ── Receiver Info ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)}
              className="w-full pl-10 pr-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              placeholder="Receiver name" />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input type="tel" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)}
              className="w-full pl-10 pr-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              placeholder="Phone number" />
          </div>
        </div>
      </section>

      <section className="mt-8 px-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Package Category</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {PACKAGE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const enabled = isCategoryEnabled(cat.id);
            const active = category === cat.id && enabled;
            return (
              <button
                key={cat.id}
                onClick={() => { if (enabled) setCategory(cat.id); }}
                disabled={!enabled}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all min-w-[90px] flex-shrink-0",
                  !enabled
                    ? "border-red-300 dark:border-red-800/60 bg-red-50 dark:bg-red-900/10 text-red-400 dark:text-red-500 opacity-60 cursor-not-allowed"
                    : active
                      ? "border-orange-600 bg-orange-600/5 text-orange-600"
                      : "border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200"
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-bold whitespace-nowrap">{cat.label}</span>
                {!enabled && <span className="text-[8px] text-red-500 font-semibold leading-tight">Not Supported</span>}
              </button>
            );
          })}
        </div>
        {isCategoryEnabled(category) ? (
          <p className="text-[11px] text-slate-400 mt-2 ml-1">
            {PACKAGE_CATEGORIES.find(c => c.id === category)?.desc}
          </p>
        ) : (
          <div className="flex items-center gap-2 mt-2 ml-1">
            <AlertTriangle className="size-3.5 text-red-500 flex-shrink-0" />
            <p className="text-[11px] text-red-500 font-medium">We do not support this kind of package category</p>
          </div>
        )}
      </section>

      {/* ── Vehicle Recommendation ── */}
      <section className="mt-6 px-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Transport Vehicle</h3>
        <div className="space-y-2">
          {/* Only show vehicles the tenant actually owns */}
          {VEHICLE_TYPES.filter(v => tenantVehicles.includes(v.id)).length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="size-5 text-amber-500 flex-shrink-0" />
              <p className="text-[13px] text-amber-700 dark:text-amber-300">No vehicles registered yet. Contact your admin to add vehicles to the fleet.</p>
            </div>
          ) : (
            <>
              {/* Compatible vehicles first */}
              {VEHICLE_TYPES.filter(v => tenantVehicles.includes(v.id) && compatibleVehicles.includes(v.id)).map((v) => {
                const Icon = v.icon;
                const isSelected = vehicle === v.id;
                // Use staff-configured capacity if available, else fall back to hardcoded
                const maxKg = tenantCapacities[v.id] ?? v.maxKg;
                const overWeight = weightKg > 0 && weightKg > maxKg;
                return (
                  <button key={v.id}
                    onClick={() => !overWeight && setVehicle(v.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      isSelected ? "border-orange-600 bg-orange-600/5" :
                      overWeight ? "border-red-100 dark:border-red-900/30 opacity-60 cursor-not-allowed" :
                      "border-slate-100 dark:border-slate-800 hover:border-orange-300"
                    )}
                  >
                    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                      isSelected ? "bg-orange-600/10 text-orange-600" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                    )}>
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-sm font-bold", isSelected ? "text-orange-600" : "text-slate-700 dark:text-slate-300")}>{v.label}</span>
                        {!overWeight && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/30 text-green-600">✓ Suitable</span>}
                        {overWeight && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/30 text-red-500">Over capacity</span>}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {overWeight
                          ? <span className="text-red-400">Max {maxKg.toLocaleString()}kg — your package is {weightKg.toLocaleString()}kg</span>
                          : <>{v.desc} · Up to {maxKg.toLocaleString()}kg</>
                        }
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Fuel className="size-3" />
                        <span>₱{v.fuelRate}/km</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* If tenant has vehicles but none fit this category */}
              {VEHICLE_TYPES.filter(v => tenantVehicles.includes(v.id) && compatibleVehicles.includes(v.id)).length === 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-300">No suitable vehicle available</p>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Your tenant's fleet doesn't have a vehicle suitable for <strong>{PACKAGE_CATEGORIES.find(c => c.id === category)?.label}</strong>. 
                      Try a different package category, or contact your admin to add the right vehicle type.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── Weight & Specifications (Issue #6 — clearly shows KG) ── */}
      <section className="mt-6 px-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Specifications</h3>
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 ml-1">Weight <span className="text-red-500">*</span></label>
          <div className="flex gap-2">
            <div className="flex items-center flex-1 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 overflow-hidden focus-within:ring-2 focus-within:ring-orange-600/20 focus-within:border-orange-600 transition-all">
              <input 
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="flex-1 px-4 py-4 bg-transparent border-none focus:ring-0 outline-none text-[15px] font-medium text-slate-900 dark:text-slate-100" 
                placeholder={weightUnit === 'kg' ? 'e.g. 5.5' : 'e.g. 3'} 
                required
              />
            </div>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setWeightUnit('kg')}
                className={cn(
                  "px-4 py-3 text-sm font-bold transition-all",
                  weightUnit === 'kg' ? "bg-orange-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                )}
              >KG</button>
              <button
                type="button"
                onClick={() => setWeightUnit('ton')}
                className={cn(
                  "px-4 py-3 text-sm font-bold transition-all",
                  weightUnit === 'ton' ? "bg-orange-600 text-white" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
                )}
              >TON</button>
            </div>
          </div>
          {weightKg > 0 && weightUnit === 'ton' && (
            <p className="text-[11px] text-slate-400 ml-1">= {weightKg.toLocaleString()} kg</p>
          )}
        </div>
      </section>

      {/* ── Extra Safety / Insurance ── */}
      <section className="mt-6 px-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Package Protection</h3>
        <button
          type="button"
          onClick={() => setExtraSafety(!extraSafety)}
          className={cn(
            "w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all duration-200 text-left",
            extraSafety
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-200"
          )}
        >
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
            extraSafety ? "bg-blue-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
          )}>
            {extraSafety ? <ShieldCheck className="size-5" /> : <Shield className="size-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white">Extra Safety Handling</span>
              <span className={cn("font-bold text-sm", extraSafety ? "text-blue-600" : "text-slate-400")}>+₱{SAFETY_FEE}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Fragile item · Priority care · Basic insurance coverage</p>
          </div>
          <div className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
            extraSafety ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-600"
          )}>
            {extraSafety && <div className="w-2 h-2 rounded-full bg-white" />}
          </div>
        </button>
      </section>

      {/* ── Shipping Method ── */}
      <section className="mt-6 px-5">
        <h3 className="text-[13px] font-bold mb-3 uppercase tracking-wider text-slate-500 dark:text-slate-400">Shipping Method</h3>
        {fetchingRoute && (
          <div className="flex items-center gap-2 text-xs text-orange-500 mb-3 ml-1">
            <Loader2 className="size-3 animate-spin" /> Calculating route...
          </div>
        )}
        <div className="space-y-3">
          {/* Standard */}
          <button
            onClick={() => setMethod('standard')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left",
              method === 'standard'
                ? "border-orange-600 bg-orange-600/5 dark:bg-orange-600/10"
                : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-200"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                method === 'standard' ? "bg-orange-600/10 text-orange-600" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
              )}>
                <Truck className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Standard</span>
                  <span className={cn("font-bold text-lg tracking-tight", method === 'standard' ? "text-orange-600" : "text-slate-900 dark:text-white")}>
                    ₱{Math.round(baseFee).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">3-7 business days</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600">Best Value</span>
                </div>
                {distKm > 0 && method === 'standard' && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <span className="text-[10px] text-slate-400">Fuel ({selectedVehicle?.fuelType})</span>
                    <span className="text-[10px] text-slate-500 text-right">₱{Math.round(fuelCost)} ({fuelRate}/km)</span>
                    <span className="text-[10px] text-slate-400">Weight ({weightKg}kg)</span>
                    <span className="text-[10px] text-slate-500 text-right">₱{Math.round(tierRate)}</span>
                    {categorySurcharge > 0 && <><span className="text-[10px] text-slate-400">Category fee</span><span className="text-[10px] text-slate-500 text-right">₱{categorySurcharge}</span></>}
                    <span className="text-[10px] text-slate-400">Base fee</span>
                    <span className="text-[10px] text-slate-500 text-right">₱50</span>
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Express */}
          <button
            onClick={() => setMethod('express')}
            className={cn(
              "w-full p-4 rounded-2xl border-2 transition-all duration-200 text-left",
              method === 'express'
                ? "border-orange-600 bg-orange-600/5 dark:bg-orange-600/10"
                : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-200"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                method === 'express' ? "bg-orange-600/10 text-orange-600" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
              )}>
                <Bolt className="size-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">Express</span>
                  <span className={cn("font-bold text-lg tracking-tight", method === 'express' ? "text-orange-600" : "text-slate-900 dark:text-white")}>
                    ₱{Math.round(baseFee * 1.8).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-400">Same day · Priority handling</p>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600">1.8× rate</span>
                </div>
                {isSelectedSunday && (
                  <p className="text-[10px] text-amber-500 font-semibold mt-1">📌 Sunday order — will be delivered Monday</p>
                )}
                {distKm > 0 && method === 'express' && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-x-4 gap-y-0.5">
                    <span className="text-[10px] text-slate-400">Fuel + Priority</span>
                    <span className="text-[10px] text-slate-500 text-right">₱{Math.round(fuelCost * 1.8)}</span>
                    <span className="text-[10px] text-slate-400">Weight ({weightKg}kg)</span>
                    <span className="text-[10px] text-slate-500 text-right">₱{Math.round(tierRate * 1.8)}</span>
                    {categorySurcharge > 0 && <><span className="text-[10px] text-slate-400">Category fee</span><span className="text-[10px] text-slate-500 text-right">₱{Math.round(categorySurcharge * 1.8)}</span></>}
                    <span className="text-[10px] text-slate-400">Base fee</span>
                    <span className="text-[10px] text-slate-500 text-right">₱{Math.round(50 * 1.8)}</span>
                  </div>
                )}
              </div>
            </div>
          </button>
        </div>

        {/* Schedule Date */}
        <div className="mt-4">
          <label className="flex items-center gap-2 text-[13px] font-bold text-slate-500 dark:text-slate-400 mb-2 ml-1">
            <CalendarDays className="size-4" />
            Schedule Delivery <span className="text-[10px] font-medium text-slate-400 normal-case">(optional — defaults to today)</span>
          </label>
          <input
            type="date"
            value={scheduledDate}
            onChange={e => setScheduledDate(e.target.value)}
            min={todayStr}
            className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 text-sm font-medium focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 outline-none transition-all"
          />
          {scheduledDate && (
            <div className="flex items-center justify-between mt-2 ml-1">
              <p className="text-[11px] text-slate-400">
                {new Date(scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                {isSunday(scheduledDate) && <span className="text-amber-500 font-semibold ml-1">· Sunday — Express will deliver Monday</span>}
              </p>
              <button onClick={() => setScheduledDate('')} className="text-[10px] font-bold text-orange-600">Clear</button>
            </div>
          )}
        </div>

        {/* Route info pill — only when route is loaded */}
        {distKm > 0 && !fetchingRoute && (
          <div className="flex items-center gap-3 mt-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
            <MapPin className="size-3.5 text-slate-400 flex-shrink-0" />
            <span className="text-[11px] text-slate-500">{distKm.toFixed(1)} km road distance</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-[11px] text-slate-500">{Math.round(routeDurationMin)} min drive</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="text-[11px] text-slate-500">{selectedVehicle?.label}</span>
          </div>
        )}
      </section>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* ── Footer with Submit ── */}
      <footer className="p-5 mt-auto border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl sticky bottom-0 z-20">
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex flex-col">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Estimated Total</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">₱{totalFee.toLocaleString()}.00</span>
          </div>
          <div className="text-[11px] text-right font-medium text-slate-400 dark:text-slate-500">
            Includes taxes & fees
          </div>
        </div>
        <button 
          onClick={handleConfirm}
          disabled={loading || !destination.trim() || !pickup.trim() || !receiverName.trim() || !receiverPhone.trim() || rawWeight <= 0 || compatibleVehicles.length === 0}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-600/25 transition-all active:scale-[0.97] flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span>Creating Shipment...</span>
            </>
          ) : (
            <>
              <span>Review & Confirm</span>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
