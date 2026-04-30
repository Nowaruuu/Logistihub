import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Package, Plus, MapPin, User, Bell, Menu, Settings, HelpCircle, LogOut, X, ChevronRight, Calculator } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const isDriver = profile?.role === 'driver';

  const navItems = isDriver ? [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: MapPin, label: 'Nearby', path: '/stations' },
    { icon: Package, label: 'Jobs', path: '/driver/jobs', isAction: true },
    { icon: Bell, label: 'Inbox', path: '/notifications' },
    { icon: User, label: 'Profile', path: '/profile' },
  ] : [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Package, label: 'Packages', path: '/packages' },
    { icon: Plus, label: 'Send', path: '/send', isAction: true },
    { icon: MapPin, label: 'Stations', path: '/stations' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const sidebarItems = isDriver ? [
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help Center', path: '/help' },
  ] : [
    { icon: Calculator, label: 'Rate Calculator', path: '/calculator' },
    { icon: MapPin, label: 'Address Book', path: '/address-book' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: HelpCircle, label: 'Help Center', path: '/help' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden max-w-md mx-auto shadow-2xl bg-white dark:bg-slate-900">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-4/5 max-w-[320px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-orange-600 flex items-center justify-center text-white font-black italic">
                    S
                  </div>
                  <span className="text-xl font-black tracking-tighter text-slate-900 dark:text-slate-100 italic">LOGISTICS PRO</span>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="size-5 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
                {/* User Profile Summary */}
                <div className="px-2 flex items-center gap-4">
                  <div className="size-14 rounded-2xl ring-4 ring-orange-600/10 p-1 overflow-hidden">
                    <img 
                      className="w-full h-full rounded-xl object-cover" 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'U')}&background=ea580c&color=fff&size=128&bold=true`} 
                      alt="Profile"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{profile?.fullName || 'Pro User'}</h4>
                    <p className="text-xs text-slate-500">{profile?.email || 'user@example.com'}</p>
                  </div>
                </div>

                {/* Sidebar Links */}
                <div className="space-y-1">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => {
                        setIsSidebarOpen(false);
                        navigate(item.path);
                      }}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 group-hover:text-orange-600 transition-colors">
                          <item.icon className="size-5" />
                        </div>
                        <span className="font-bold text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100">{item.label}</span>
                      </div>
                      <ChevronRight className="size-4 text-slate-300 group-hover:text-orange-600 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleSignOut}
                  className="w-full h-14 flex items-center justify-center gap-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
                >
                  <LogOut className="size-5" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <header className="flex items-center bg-white dark:bg-slate-900 px-6 py-5 sticky top-0 z-30 justify-between border-b border-slate-50 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="text-slate-900 dark:text-slate-100 size-6" />
          </button>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-slate-100">
            {location.pathname === '/dashboard' ? (isDriver ? 'Driver Dashboard' : 'My Deliveries') : 
             location.pathname === '/packages' ? 'My Packages' :
             location.pathname === '/driver/jobs' ? 'Available Jobs' :
             location.pathname === '/send' ? 'Send Package' :
             location.pathname === '/stations' ? 'Nearby Stations' :
             location.pathname === '/calculator' ? 'Rate Calculator' :
             location.pathname === '/address-book' ? 'Address Book' :
             location.pathname === '/settings' ? 'Settings' :
             location.pathname === '/help' ? 'Help Center' :
             location.pathname === '/profile' ? 'Account' : 'Logistics Pro'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/notifications')}
            className="relative flex size-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="text-slate-900 dark:text-slate-100 size-6" />
            <span className="absolute top-2 right-2 size-2 bg-orange-600 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          <button 
            onClick={() => navigate('/profile')}
            className="size-10 rounded-full ring-2 ring-orange-600/20 p-0.5 overflow-hidden hover:ring-orange-600 transition-all active:scale-95"
          >
            <img 
              className="w-full h-full rounded-full object-cover" 
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.fullName || 'U')}&background=ea580c&color=fff&size=128&bold=true`} 
              alt="Profile"
              referrerPolicy="no-referrer"
            />
          </button>
        </div>
      </header>

      <main className="flex-1 pb-28 overflow-y-auto bg-white dark:bg-slate-900 min-h-[50vh]">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-slate-200/50 dark:border-slate-800/50 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl px-8 pb-8 pt-4 flex justify-between items-center z-40">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          if (item.isAction) {
            return (
              <Link 
                key={item.path}
                to={item.path}
                className="flex flex-col items-center gap-1.5 text-slate-400 hover:text-orange-600 transition-colors group"
              >
                <div className="size-12 -mt-12 mb-1 rounded-full bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/40 text-white active:scale-90 transition-transform">
                  <item.icon className="size-6" />
                </div>
                <span className={cn("text-[11px] font-bold", isActive ? "text-orange-600" : "text-slate-400")}>
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link 
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1.5 transition-colors group",
                isActive ? "text-orange-600" : "text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <item.icon className={cn("size-6", isActive && "fill-current")} />
              <span className={cn("text-[11px] font-bold", isActive ? "text-orange-600" : "text-slate-400")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
