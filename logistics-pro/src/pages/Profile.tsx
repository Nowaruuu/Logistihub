import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { deliveryService } from '../services/deliveryService';
import { userService } from '../services/userService';
import { seedService } from '../services/seedService';
import { MapPin, CreditCard, Bell, HelpCircle, LogOut, Edit2, ChevronRight, Award, Plus, Trash2, Database, Truck, Star, Wallet, FileText, Activity, Save, X } from 'lucide-react';
import { Driver } from '../types';
import { cn } from '../lib/utils';

export default function Profile() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [driverData, setDriverData] = useState<Driver | null>(null);
  const [loadingDriver, setLoadingDriver] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deliveryCounts, setDeliveryCounts] = useState({ total: 0, active: 0 });
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    vehicleModel: '',
    plateNumber: ''
  });

  useEffect(() => {
    if (profile) {
      setEditForm(prev => ({
        ...prev,
        fullName: profile.fullName || '',
        phone: profile.phone || ''
      }));
    }
  }, [profile]);

  // Load real delivery counts for the stats grid
  useEffect(() => {
    if (!profile || profile.role === 'driver') return;
    deliveryService.getAllDeliveries().then(docs => {
      const all = docs || [];
      setDeliveryCounts({
        total: all.length,
        active: all.filter(d => d.status !== 'Delivered' && !d.isPaid).length
      });
    }).catch(() => {});
  }, [profile]);

  useEffect(() => {
    if (driverData) {
      setEditForm(prev => ({
        ...prev,
        vehicleModel: driverData.vehicleModel || '',
        plateNumber: driverData.plateNumber || ''
      }));
    }
  }, [driverData]);

  useEffect(() => {
    if (profile?.role === 'driver') {
      const fetchDriver = async () => {
        setLoadingDriver(true);
        try {
          const data = await userService.getDriver(profile.uid);
          setDriverData(data);
        } catch (err) {
          console.error("Error fetching driver record:", err);
        } finally {
          setLoadingDriver(false);
        }
      };
      fetchDriver();
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      // 1. Update Core Profile
      await userService.saveProfile(profile.uid, {
        fullName: editForm.fullName,
        phone: editForm.phone
      });

      // 2. Update Driver info if applicable
      if (profile.role === 'driver') {
        const updatedDriver = {
          ...driverData,
          vehicleModel: editForm.vehicleModel,
          plateNumber: editForm.plateNumber,
          updatedAt: new Date().toISOString()
        };
        await userService.saveDriver(profile.uid, updatedDriver);
        setDriverData(updatedDriver as Driver);
      }

      setIsEditing(false);
      // Note: useAuth listener will pick up profile changes
    } catch (err) {
      console.error("Error saving profile:", err);
      alert('Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/signin');
  };

  const handleSeedData = async () => {
    if (!profile) return;
    alert('Sample data feature coming soon.');
  };

  const handleClearShipments = async () => {
    if (!profile) return;
    alert('Clear shipments feature coming soon.');
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    const confirm = window.confirm("Are you sure you want to delete your account? This will remove all your data and access.");
    if (!confirm) return;

    try {
      // 1. Delete Firestore User document
      await userService.deleteProfile(profile.uid);
      
      // 2. Note: We'd also delete driver data, shipments etc in a real production app
      // For now, let's just delete the main account data
      
      // 3. Sign out (as the auth user deletion requires recent login usually)
      await signOut();
      alert('Profile data deleted. To fully remove the account from Firebase Auth, please use the Firebase Console if login session has expired.');
      navigate('/signin');
    } catch (err) {
      console.error("Error deleting account:", err);
      alert('Failed to delete account. You might need to re-authenticate first.');
    }
  };

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
      <div className="size-12 rounded-full border-4 border-orange-600 border-t-transparent animate-spin mb-4"></div>
      <p className="text-slate-500 text-sm">Loading profile...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-slate-50/50 dark:bg-slate-950">
      {/* Profile Section */}
      <div className="flex flex-col p-8 items-center bg-white dark:bg-slate-900/40 rounded-b-[2.5rem] shadow-sm mb-6">
        <div className="relative">
          <div className="absolute inset-0 bg-orange-600/20 rounded-full blur-2xl -z-10 animate-pulse"></div>
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full h-36 w-36 ring-4 ring-white dark:ring-slate-800 shadow-2xl overflow-hidden">
            <img 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.fullName || 'U')}&background=ea580c&color=fff&size=256&bold=true`} 
              alt="Avatar"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              "absolute bottom-2 right-2 p-2.5 rounded-full border-4 border-white dark:border-slate-900 shadow-lg text-white transition-all transform active:scale-95",
              isEditing ? "bg-slate-500" : "bg-orange-600 hover:scale-105"
            )}
          >
            {isEditing ? <X className="size-4" /> : <Edit2 className="size-4" />}
          </button>
        </div>
        <div className="flex flex-col items-center justify-center mt-6 text-center w-full max-w-sm">
          {isEditing ? (
            <div className="flex flex-col gap-4 w-full">
              <div className="flex flex-col items-start gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Full Name</label>
                <input 
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Full Name"
                />
              </div>
              <div className="flex flex-col items-start gap-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Phone Number</label>
                <input 
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-orange-500 transition-all"
                  placeholder="Phone Number"
                />
              </div>

              {profile.role === 'driver' && (
                <>
                  <div className="flex flex-col items-start gap-1 text-left mt-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 px-1">Vehicle Model</label>
                    <input 
                      type="text"
                      value={editForm.vehicleModel}
                      onChange={(e) => setEditForm({ ...editForm, vehicleModel: e.target.value })}
                      className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border-none rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 transition-all italic"
                      placeholder="e.g. Toyota Prius 2022"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1 text-left">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 px-1">Plate Number</label>
                    <input 
                      type="text"
                      value={editForm.plateNumber}
                      onChange={(e) => setEditForm({ ...editForm, plateNumber: e.target.value })}
                      className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border-none rounded-xl p-3 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 transition-all uppercase tracking-widest"
                      placeholder="e.g. ABC-1234"
                    />
                  </div>
                </>
              )}

              <button 
                onClick={handleSaveProfile}
                disabled={saving}
                className="mt-2 w-full bg-orange-600 text-white rounded-xl py-3.5 font-bold flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-lg shadow-orange-600/20"
              >
                {saving ? (
                  <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Save className="size-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{profile.fullName}</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{profile.email}</p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-orange-600 text-xs font-bold uppercase tracking-wider">{profile.phone || 'No phone set'}</span>
                </div>
                {profile.role === 'driver' && (
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50">
                    <Truck className="size-3 text-emerald-600" />
                    <span className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Verified Driver</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {profile.role === 'driver' && driverData && (
        <div className="px-6 mb-6">
          <div className="bg-slate-900 dark:bg-slate-900 p-5 rounded-3xl shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Truck className="size-20" />
            </div>
            <div className="relative z-10 flex items-center gap-4">
              <div className="bg-slate-800 p-3 rounded-2xl">
                <Truck className="size-8 text-orange-500" />
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none">Primary Vehicle</p>
                <p className="text-white font-bold text-lg mt-1">{driverData.vehicleModel}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono font-bold tracking-wider">{driverData.plateNumber}</div>
                  <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{driverData.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 px-6 pb-8">
        {profile.role === 'driver' ? (
          <>
            <div className="bg-white dark:bg-slate-900 shadow-sm p-4 rounded-2xl flex flex-col items-center border border-slate-100 dark:border-slate-800">
              <span className="text-slate-900 dark:text-white font-bold text-xl">{driverData?.totalDeliveries || 0}</span>
              <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Deliveries</span>
            </div>
            <div className="bg-orange-600/5 dark:bg-orange-600/10 p-4 rounded-2xl flex flex-col items-center border border-orange-600/10">
              <div className="flex items-center gap-1">
                <Star className="size-4 text-orange-600 fill-orange-600" />
                <span className="text-orange-600 font-bold text-xl">{driverData?.rating?.toFixed(1) || '0.0'}</span>
              </div>
              <span className="text-orange-600/70 dark:text-orange-600/60 text-[10px] uppercase font-bold tracking-widest mt-1">Rating</span>
            </div>
            <div className="bg-white dark:bg-slate-900 shadow-sm p-4 rounded-2xl flex flex-col items-center border border-slate-100 dark:border-slate-800">
              <Wallet className="text-emerald-500 size-6" />
              <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Earnings</span>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 shadow-sm p-4 rounded-2xl flex flex-col items-center border border-slate-100 dark:border-slate-800">
              <span className="text-slate-900 dark:text-white font-bold text-xl">{deliveryCounts.total}</span>
              <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">Orders</span>
            </div>
            <div className="bg-orange-600/5 dark:bg-orange-600/10 p-4 rounded-2xl flex flex-col items-center border border-orange-600/10">
              <span className="text-orange-600 font-bold text-xl">{deliveryCounts.active}</span>
              <span className="text-orange-600/70 dark:text-orange-600/60 text-[10px] uppercase font-bold tracking-widest mt-1">Active</span>
            </div>
            <div className="bg-white dark:bg-slate-900 shadow-sm p-4 rounded-2xl flex flex-col items-center border border-slate-100 dark:border-slate-800">
              <Award className="text-amber-500 size-6" />
              <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">{profile.tier}</span>
            </div>
          </>
        )}
      </div>

      {/* Menu Section */}
      <div className="flex flex-col gap-3 px-4 mb-28">
        {profile.role === 'driver' && (
          <div className="px-2 mb-6">
            <h3 className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-4">Driver Operations</h3>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => navigate('/driver/vehicle')}
                className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 shrink-0 size-12 group-hover:scale-110 transition-transform">
                  <Truck className="size-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">Vehicle Information</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{driverData?.vehicleModel || 'No vehicle set'} • {driverData?.plateNumber || 'N/A'}</p>
                </div>
                <ChevronRight className="text-slate-300 dark:text-slate-600 size-5" />
              </button>

              <button 
                onClick={() => navigate('/driver/earnings')}
                className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 shrink-0 size-12 group-hover:scale-110 transition-transform">
                  <Wallet className="size-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">Earnings & Payouts</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">View your wallet and history</p>
                </div>
                <ChevronRight className="text-slate-300 dark:text-slate-600 size-5" />
              </button>

              <button 
                onClick={() => navigate('/driver/stats')}
                className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 shrink-0 size-12 group-hover:scale-110 transition-transform">
                  <Activity className="size-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">Performance Stats</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Acceptance rate and feedback</p>
                </div>
                <ChevronRight className="text-slate-300 dark:text-slate-600 size-5" />
              </button>

              <button 
                onClick={() => navigate('/driver/documents')}
                className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 shrink-0 size-12 group-hover:scale-110 transition-transform">
                  <FileText className="size-6" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">Driver Documents</p>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">License, Plate, Insurance</p>
                </div>
                <ChevronRight className="text-slate-300 dark:text-slate-600 size-5" />
              </button>
            </div>
          </div>
        )}

        <div className="px-2">
          <h3 className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-4">Account Settings</h3>
          <div className="flex flex-col gap-2">
            {profile.role !== 'driver' && (
              <>
                <button 
                  onClick={() => navigate('/address-book')}
                  className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 shrink-0 size-12 group-hover:scale-110 transition-transform">
                    <MapPin className="size-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">Saved Addresses</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Manage your delivery locations</p>
                  </div>
                  <ChevronRight className="text-slate-300 dark:text-slate-600 size-5" />
                </button>

                <button 
                  onClick={() => navigate('/payment-methods')}
                  className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-500 shrink-0 size-12 group-hover:scale-110 transition-transform">
                    <CreditCard className="size-6" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">Payment Methods</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Cards, Wallets, and more</p>
                  </div>
                  <ChevronRight className="text-slate-300 dark:text-slate-600 size-5" />
                </button>
              </>
            )}

            <button 
              onClick={() => navigate('/notifications')}
              className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 shrink-0 size-12 group-hover:scale-110 transition-transform">
                <Bell className="size-6" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">Notifications</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Manage alerts and preferences</p>
              </div>
              <ChevronRight className="text-slate-300 dark:text-slate-600 size-5" />
            </button>
          </div>
        </div>

        <div className="px-2 mt-4">
          <h3 className="text-slate-400 dark:text-slate-500 text-[11px] font-bold uppercase tracking-widest mb-4">Support & Info</h3>
          <div className="flex flex-col gap-2">
            <button 
              onClick={() => navigate('/help')}
              className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 size-12 group-hover:scale-110 transition-transform">
                <HelpCircle className="size-6" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-slate-900 dark:text-slate-100 font-bold text-[15px]">Help Center</p>
                <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">FAQs and support chat</p>
              </div>
              <ChevronRight className="text-slate-300 dark:text-slate-600 size-5" />
            </button>
          </div>
        </div>

        <div className="px-2 mt-6 flex flex-col gap-2">
          {profile.role !== 'driver' && (
            <button 
              onClick={handleSeedData}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10 text-orange-600 hover:bg-orange-50 transition-colors active:scale-[0.98]"
            >
              <Plus className="size-5" />
              <p className="font-bold text-[15px]">Seed Sample Data</p>
            </button>
          )}

          {profile.role === 'admin' && (
            <button 
              onClick={() => navigate('/export')}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10 text-blue-600 hover:bg-blue-50 transition-colors active:scale-[0.98]"
            >
              <Database className="size-5" />
              <p className="font-bold text-[15px]">Database Export</p>
            </button>
          )}

          <button 
            onClick={handleClearShipments}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors active:scale-[0.98]"
          >
            <Trash2 className="size-5" />
            <p className="font-bold text-[15px]">Clear All Shipments</p>
          </button>

          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 transition-colors active:scale-[0.98]"
          >
            <LogOut className="size-5" />
            <p className="font-bold text-[15px]">Sign Out</p>
          </button>

          <button 
            onClick={handleDeleteAccount}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 bg-red-50/50 dark:bg-red-900/10 text-red-500 hover:bg-red-50 transition-colors active:scale-[0.98]"
          >
            <Trash2 className="size-5" />
            <p className="font-bold text-[15px]">Delete Account</p>
          </button>
        </div>
      </div>
    </div>
  );
}
