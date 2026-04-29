import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, X, Shield, CheckCircle2, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

interface PaymentMethod {
  id: string;
  type: 'Visa' | 'Mastercard' | 'Amex' | 'GCash' | 'Maya';
  last4: string;
  expiryDate: string;
  cardHolder: string;
  isDefault: boolean;
}

export default function PaymentMethods() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    type: 'Visa' as const,
    cardNumber: '',
    expiryDate: '',
    cardHolder: '',
    isDefault: false
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const last4 = formData.cardNumber.slice(-4) || '4242';
    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: formData.type,
      last4,
      expiryDate: formData.expiryDate,
      cardHolder: formData.cardHolder,
      isDefault: formData.isDefault || methods.length === 0,
    };

    setMethods(prev => [...prev, newMethod]);
    setIsAdding(false);
    setFormData({ type: 'Visa', cardNumber: '', expiryDate: '', cardHolder: '', isDefault: false });
  };

  const handleDelete = async (id: string) => {
    setMethods(prev => prev.filter(m => m.id !== id));
  };

  const setAsDefault = async (id: string) => {
    setMethods(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
  };

  const getCardColor = (type: string) => {
    switch (type) {
      case 'Visa': return 'from-blue-600 to-blue-800';
      case 'Mastercard': return 'from-orange-500 to-red-600';
      case 'Amex': return 'from-emerald-500 to-teal-700';
      case 'GCash': return 'from-blue-400 to-blue-600';
      case 'Maya': return 'from-slate-800 to-slate-950';
      default: return 'from-slate-600 to-slate-800';
    }
  };

  return (
    <div className="px-6 py-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Payment Methods</h2>
          <p className="text-sm text-slate-500">Manage your cards and wallets</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="size-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-600/30 active:scale-90 transition-all"
        >
          <Plus className="size-6" />
        </button>
      </div>

      {/* Security Badge */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl flex items-center gap-4">
        <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shrink-0">
          <Shield className="size-5" />
        </div>
        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium leading-relaxed">
          Your payment information is encrypted and stored securely. We never store your full card number.
        </p>
      </div>

      {/* Methods List */}
      <div className="space-y-4 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="size-10 border-4 border-orange-600/20 border-t-orange-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 font-medium">Loading your methods...</p>
          </div>
        ) : methods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="size-20 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-300">
              <CreditCard className="size-10" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">No payment methods</h3>
              <p className="text-sm text-slate-500">Add a card or wallet to start shipping</p>
            </div>
          </div>
        ) : (
          methods.map((method) => (
            <motion.div 
              layout
              key={method.id}
              className={cn(
                "relative overflow-hidden rounded-[2rem] p-6 text-white shadow-xl transition-all active:scale-[0.98]",
                "bg-gradient-to-br",
                getCardColor(method.type)
              )}
            >
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Card Type</span>
                    <span className="font-black italic text-xl tracking-tighter">{method.type.toUpperCase()}</span>
                  </div>
                  <div className="flex gap-2">
                    {method.isDefault && (
                      <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5">
                        <CheckCircle2 className="size-3" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Default</span>
                      </div>
                    )}
                    <button 
                      onClick={() => handleDelete(method.id)}
                      className="size-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-rose-500 transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-8">
                  <p className="text-2xl font-mono tracking-[0.2em]">•••• •••• •••• {method.last4}</p>
                </div>

                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Card Holder</span>
                    <span className="font-bold tracking-tight">{method.cardHolder}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Expires</span>
                    <span className="font-bold tracking-tight">{method.expiryDate}</span>
                  </div>
                </div>
              </div>

              {/* Decorative Circles */}
              <div className="absolute -right-10 -bottom-10 size-40 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -left-10 -top-10 size-40 bg-black/10 rounded-full blur-3xl" />

              {!method.isDefault && (
                <button 
                  onClick={() => setAsDefault(method.id)}
                  className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity backdrop-blur-[2px]"
                >
                  <span className="bg-white text-slate-900 px-6 py-2 rounded-full font-bold text-sm shadow-xl">
                    Set as Default
                  </span>
                </button>
              )}
            </motion.div>
          ))
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
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Add Payment Method</h3>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="size-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="size-6 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-8 space-y-6">
                <div className="grid grid-cols-3 gap-2">
                  {['Visa', 'Mastercard', 'Amex', 'GCash', 'Maya'].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFormData({...formData, type: t as any})}
                      className={cn(
                        "h-12 rounded-2xl font-bold text-[10px] uppercase tracking-wider transition-all",
                        formData.type === t 
                          ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" 
                          : "bg-slate-50 dark:bg-slate-800 text-slate-500"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Card Number</label>
                    <input 
                      required
                      placeholder="0000 0000 0000 0000"
                      maxLength={19}
                      value={formData.cardNumber}
                      onChange={e => setFormData({...formData, cardNumber: e.target.value})}
                      className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Expiry Date</label>
                      <input 
                        required
                        placeholder="MM/YY"
                        maxLength={5}
                        value={formData.expiryDate}
                        onChange={e => setFormData({...formData, expiryDate: e.target.value})}
                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">CVV</label>
                      <input 
                        required
                        type="password"
                        placeholder="•••"
                        maxLength={3}
                        className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Card Holder Name</label>
                    <input 
                      required
                      placeholder="John Doe"
                      value={formData.cardHolder}
                      onChange={e => setFormData({...formData, cardHolder: e.target.value})}
                      className="w-full h-14 px-6 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-3 px-2 cursor-pointer group">
                  <div className="relative size-6">
                    <input 
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={e => setFormData({...formData, isDefault: e.target.checked})}
                      className="peer sr-only"
                    />
                    <div className="size-full rounded-lg border-2 border-slate-200 dark:border-slate-700 peer-checked:bg-orange-600 peer-checked:border-orange-600 transition-all" />
                    <CheckCircle2 className="absolute inset-0 size-full p-1 text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                  </div>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                    Set as default payment method
                  </span>
                </label>

                <button 
                  type="submit"
                  className="w-full h-16 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-600/30 active:scale-[0.98] transition-all mt-4"
                >
                  Add Payment Method
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
