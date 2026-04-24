import React, { useState } from 'react';
import { Search, HelpCircle, MessageCircle, FileText, ChevronRight, Phone, Mail, Globe, Truck, Wallet, Shield, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function HelpCenter() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'client' | 'driver'>(profile?.role === 'driver' ? 'driver' : 'client');

  const clientCategories = [
    { icon: HelpCircle, label: 'General Help', color: 'bg-orange-600' },
    { icon: FileText, label: 'Shipping Policy', color: 'bg-blue-600' },
    { icon: MessageCircle, label: 'Customer Support', color: 'bg-emerald-600' },
    { icon: MapPin, label: 'Tracking Help', color: 'bg-indigo-600' },
  ];

  const driverCategories = [
    { icon: Truck, label: 'Delivery Help', color: 'bg-orange-600' },
    { icon: Wallet, label: 'Earnings Info', color: 'bg-emerald-600' },
    { icon: Shield, label: 'Driver Safety', color: 'bg-blue-600' },
    { icon: Mail, label: 'Support Chat', color: 'bg-indigo-600' },
  ];

  const clientFaqs = [
    { question: 'How do I track my package?', answer: 'You can track your package by entering the tracking number on the home screen or in the tracking section.' },
    { question: 'What are the shipping rates?', answer: 'Shipping rates vary based on weight, size, and destination. Use our Rate Calculator to get an estimate.' },
    { question: 'How do I change my delivery address?', answer: 'You can update your delivery address in the "Address Book" or by contacting support if the package is already in transit.' },
    { question: 'What happens if I miss a delivery?', answer: 'We will attempt delivery up to three times. You can also reschedule via the tracking page.' },
  ];

  const driverFaqs = [
    { question: 'When do I get paid?', answer: 'Earnings are processed weekly and deposited into your registered bank account every Tuesday.' },
    { question: 'How do I report a vehicle issue?', answer: 'Go to the vehicle section in your profile and select "Report Issue" or contact driver support immediately.' },
    { question: 'What if the customer is not home?', answer: 'Follow the protocol in the app: call the customer twice, then wait for 5 minutes before marking as unsuccessful.' },
    { question: 'How do I improve my rating?', answer: 'Provide timely deliveries, maintain a professional attitude, and ensure packages are handled with care.' },
  ];

  const categories = activeTab === 'driver' ? driverCategories : clientCategories;
  const faqs = activeTab === 'driver' ? driverFaqs : clientFaqs;

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-6 py-4 space-y-8 pb-24">
      {/* Header & Role Switcher */}
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">How can we help?</h1>
        
        <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
          <button 
            onClick={() => setActiveTab('client')}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'client' 
                ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" 
                : "text-slate-500"
            )}
          >
            Customer Help
          </button>
          <button 
            onClick={() => setActiveTab('driver')}
            className={cn(
              "flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
              activeTab === 'driver' 
                ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" 
                : "text-slate-500"
            )}
          >
            Driver Help
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'driver' ? "Search driver resources..." : "Search for help..."}
          className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all text-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 gap-4">
        {categories.map((cat, idx) => (
          <motion.button
            key={cat.label}
            layoutId={cat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 shadow-sm hover:border-orange-600/50 transition-colors"
          >
            <div className={cn("size-12 rounded-2xl flex items-center justify-center text-white shadow-lg", cat.color)}>
              <cat.icon className="size-6" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase tracking-widest">{cat.label}</span>
          </motion.button>
        ))}
      </div>

      {/* FAQs */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">
          {searchQuery ? 'Search Results' : 'Frequently Asked Questions'}
        </h3>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredFaqs.length > 0 ? (
              filteredFaqs.map((faq, idx) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800"
                >
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{faq.question}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{faq.answer}</p>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <HelpCircle className="size-12 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No results found for your search.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Contact Support */}
      <div className="p-8 rounded-[32px] bg-slate-900 dark:bg-orange-600 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 size-40 bg-orange-600 rounded-full blur-[80px] opacity-20 dark:hidden"></div>
        <div className="relative z-10">
          <h3 className="text-xl font-bold mb-2">Still need help?</h3>
          <p className="text-slate-400 dark:text-orange-100 text-sm mb-6 leading-relaxed">
            Our specialized support teams are available 24/7 to assist {activeTab === 'driver' ? 'drivers' : 'customers'} with any concerns.
          </p>
          <div className="flex flex-col gap-3">
            <button className="w-full h-12 bg-orange-600 dark:bg-white text-white dark:text-orange-600 font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <MessageCircle className="size-5" />
              Chat with {activeTab === 'driver' ? 'Driver' : 'Customer'} Support
            </button>
            <button className="w-full h-12 bg-white/5 dark:bg-white/10 text-white font-bold rounded-xl border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <Phone className="size-5" />
              Request Callback
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

