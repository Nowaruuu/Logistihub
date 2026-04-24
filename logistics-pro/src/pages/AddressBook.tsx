import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Search, MoreVertical, Trash2, Edit2, X, User, Phone, Home, Briefcase, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { addressService } from '../services/addressService';
import { SavedAddress } from '../types';

export default function AddressBook() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    label: 'Home',
    fullName: '',
    phone: '',
    address: '',
    city: '',
    zipCode: ''
  });
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    if (!user) return;

    const unsubscribe = addressService.subscribeToAddresses(user.uid, (addrList) => {
      setAddresses(addrList);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s-]{7,15}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return "Please enter a valid phone number (7-15 digits)";
    }
    return "";
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const error = validatePhone(formData.phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    try {
      await addressService.addAddress(user.uid, formData);
      setIsAdding(false);
      setPhoneError('');
      setFormData({
        label: 'Home',
        fullName: '',
        phone: '',
        address: '',
        city: '',
        zipCode: ''
      });
    } catch (error) {
      console.error("Error adding address:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await addressService.deleteAddress(user.uid, id);
    } catch (error) {
      console.error("Error deleting address:", error);
    }
  };

  const filteredAddresses = addresses.filter(addr => 
    addr.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addr.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    addr.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home': return Home;
      case 'office': return Briefcase;
      case 'favorite': return Heart;
      default: return MapPin;
    }
  };

  return (
    <div className="px-6 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Address Book</h2>
          <p className="text-sm text-slate-500">Manage your saved recipients</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="size-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/30 active:scale-90 transition-all"
        >
          <Plus className="size-6" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
        <input 
          type="text"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all"
        />
      </div>

      {/* Address List */}
      <div className="space-y-4 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="size-10 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading your addresses...</p>
          </div>
        ) : filteredAddresses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="size-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300">
              <MapPin className="size-10" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">No addresses found</h3>
              <p className="text-sm text-slate-500">Start by adding your first recipient</p>
            </div>
          </div>
        ) : (
          filteredAddresses.map((addr) => {
            const Icon = getLabelIcon(addr.label);
            return (
              <motion.div 
                layout
                key={addr.id}
                className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <div className="size-12 rounded-2xl bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:text-orange-600 transition-colors">
                      <Icon className="size-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{addr.fullName}</h4>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-600/10 text-orange-600">
                          {addr.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-[200px]">
                        {addr.address}, {addr.city} {addr.zipCode}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(addr.id)}
                    className="size-8 flex items-center justify-center rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-300 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 flex items-center gap-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Phone className="size-3.5" />
                    <span className="text-xs font-medium">{addr.phone}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[40px] sm:rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add New Address</h3>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="size-6 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleAddAddress} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-3 gap-3">
                  {['Home', 'Office', 'Favorite'].map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setFormData({...formData, label: l})}
                      className={`h-12 rounded-2xl font-bold text-xs transition-all ${
                        formData.label === l 
                          ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' 
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                    <input 
                      required
                      placeholder="Full Name"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                      className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                      <input 
                        required
                        type="tel"
                        placeholder="Phone Number"
                        value={formData.phone}
                        onChange={e => {
                          setFormData({...formData, phone: e.target.value});
                          if (phoneError) setPhoneError('');
                        }}
                        className={`w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 transition-all ${
                          phoneError ? 'ring-2 ring-rose-500' : 'focus:ring-orange-600'
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-[10px] font-bold text-rose-500 pl-4">{phoneError}</p>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-4 size-5 text-slate-400" />
                    <textarea 
                      required
                      placeholder="Street Address"
                      rows={3}
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      required
                      placeholder="City/Province"
                      value={formData.city}
                      onChange={e => setFormData({...formData, city: e.target.value})}
                      className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all"
                    />
                    <input 
                      placeholder="Zip Code"
                      value={formData.zipCode}
                      onChange={e => setFormData({...formData, zipCode: e.target.value})}
                      className="w-full h-14 px-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full h-16 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-600/30 active:scale-[0.98] transition-all mt-4"
                >
                  Save Address
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
