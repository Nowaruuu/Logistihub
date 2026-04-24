import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { UserPlus, ArrowRight, Mail, Lock, Eye, EyeOff, User, AtSign, Truck, UserCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { cn } from '../lib/utils';
import { db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function SignUp() {
  const [role, setRole] = useState<'user' | 'driver'>('user');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [vehicleType, setVehicleType] = useState('Motorcycle');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Set display name
      await updateProfile(user, { displayName: fullName });

      // 3. Save initial profile in Firestore
      console.log(`Saving profile for ${user.uid} with role: ${role}`);
      await userService.saveProfile(user.uid, {
        fullName,
        username,
        email,
        role: role,
        tier: 'Bronze'
      });

      // 3.1 If driver, save additional driver info
      if (role === 'driver') {
        console.log(`Saving driver details for ${user.uid}`);
        await setDoc(doc(db, 'drivers', user.uid), {
          uid: user.uid,
          vehicleType,
          plateNumber,
          vehicleModel,
          status: 'Offline',
          verificationStatus: 'Pending',
          rating: 5.0,
          totalDeliveries: 0,
          lastActive: new Date().toISOString()
        });
      }

      // 4. Sign out and redirect to sign in
      await signOut(auth);
      alert('Account created successfully! Please sign in with your credentials.');
      navigate('/signin');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already exists. Please try signing in.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 dark:bg-slate-950">
      <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-white dark:bg-slate-900 shadow-2xl overflow-x-hidden">
        <div className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 pb-2 justify-between">
          <div className="text-orange-600 flex size-10 shrink-0 items-center justify-center bg-orange-600/10 rounded-lg">
            <UserPlus className="size-6" />
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight tracking-tight flex-1 text-center pr-10">Create Account</h2>
        </div>

        <div className="px-6 pt-10 pb-4">
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-extrabold leading-tight text-left">Join Logistics Pro</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">Create an account to start managing your deliveries with ease.</p>
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4 px-6 py-4">
          {error && <p className="text-red-500 text-xs font-bold px-1 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}
          
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-2">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                role === 'user' ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" : "text-slate-500"
              )}
            >
              <UserCircle className="size-4" />
              Client
            </button>
            <button
              type="button"
              onClick={() => setRole('driver')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                role === 'driver' ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" : "text-slate-500"
              )}
            >
              <Truck className="size-4" />
              Driver
            </button>
          </div>
          
          <div className="flex flex-col w-full">
            <label className="group flex flex-col flex-1">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Full Name</p>
              <div className="relative flex items-center">
                <User className="absolute left-4 text-slate-400 group-focus-within:text-orange-600 transition-colors duration-200 size-5" />
                <input 
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 pl-12 pr-4 text-[15px] font-normal transition-all" 
                  placeholder="e.g. John Doe" 
                  required
                />
              </div>
            </label>
          </div>

          <div className="flex flex-col w-full">
            <label className="group flex flex-col flex-1">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Username</p>
              <div className="relative flex items-center">
                <AtSign className="absolute left-4 text-slate-400 group-focus-within:text-orange-600 transition-colors duration-200 size-5" />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 pl-12 pr-4 text-[15px] font-normal transition-all" 
                  placeholder="e.g. johndoe" 
                  required
                />
              </div>
            </label>
          </div>

          <div className="flex flex-col w-full">
            <label className="group flex flex-col flex-1">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Email Address</p>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 text-slate-400 group-focus-within:text-orange-600 transition-colors duration-200 size-5" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 pl-12 pr-4 text-[15px] font-normal transition-all" 
                  placeholder="e.g. name@email.com" 
                  required
                />
              </div>
            </label>
          </div>

          <div className="flex flex-col w-full">
            <label className="group flex flex-col flex-1">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Password</p>
              <div className="flex w-full flex-1 items-stretch rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus-within:ring-2 focus-within:ring-orange-600/20 focus-within:border-orange-600 transition-all duration-200">
                <Lock className="flex items-center ml-4 text-slate-400 group-focus-within:text-orange-600 transition-colors size-5 self-center" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex w-full min-w-0 flex-1 bg-transparent border-none focus:ring-0 h-14 placeholder:text-slate-400 pl-3 pr-2 text-[15px] font-normal text-slate-900 dark:text-slate-100" 
                  placeholder="Create a password" 
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 flex items-center justify-center px-4 hover:text-orange-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2 px-1">Must be at least 6 characters long.</p>
            </label>
          </div>

          <AnimatePresence>
            {role === 'driver' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-4 overflow-hidden"
              >
                <div className="pt-2 pb-1 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-slate-900 dark:text-slate-100 text-sm font-bold">Vehicle Details</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col flex-1">
                    <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Vehicle Type</p>
                    <select 
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      className="flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 px-4 text-[15px] font-normal transition-all appearance-none"
                    >
                      <option>Motorcycle</option>
                      <option>Van</option>
                      <option>Truck</option>
                      <option>Bicycle</option>
                    </select>
                  </div>
                  <div className="flex flex-col flex-1">
                    <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Plate Number</p>
                    <input 
                      type="text"
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                      className="flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 px-4 text-[15px] font-normal transition-all" 
                      placeholder="ABC-1234" 
                      required={role === 'driver'}
                    />
                  </div>
                </div>

                <div className="flex flex-col w-full">
                  <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Vehicle Model</p>
                  <input 
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 px-4 text-[15px] font-normal transition-all" 
                    placeholder="e.g. Honda Click 125i" 
                    required={role === 'driver'}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="py-6">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              <span>{loading ? `Creating ${role === 'driver' ? 'Driver' : 'Client'} Account...` : `Sign Up as ${role === 'driver' ? 'Driver' : 'Client'}`}</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center justify-center px-6 pb-12 pt-2">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Already have an account?{' '}
            <Link to="/signin" className="text-orange-600 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

        <div className="mt-auto px-6 py-6 text-center border-t border-slate-50 dark:border-slate-800/50">
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium tracking-wide">
            By signing up, you agree to our <span className="text-slate-500 dark:text-slate-300">Terms of Service</span> and <span className="text-slate-500 dark:text-slate-300">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
