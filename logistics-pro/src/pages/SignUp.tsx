import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowRight, Mail, Lock, Eye, EyeOff, User, AtSign, Truck, UserCircle, Phone, Briefcase } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const API_BASE_URL = 'https://logistichub.ddns.net';

export default function SignUp() {
  const [role, setRole] = useState<'user' | 'driver'>('user');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const navigate = useNavigate();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!slug) { setError('Workspace ID is required.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      if (role === 'user') {
        // Customer registration via backend API
        const body: any = { first_name: firstName, last_name: lastName, email, username, phone, password };
        if (otpSent) body.otp = otp;

        const res = await fetch(`${API_BASE_URL}/${slug}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed.');

        if (data.require_otp) {
          setOtpSent(true);
          setLoginEmail(data.login_email || '');
          setError('');
          return;
        }

        // Registration complete
        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_slug', slug);
        }
        alert(`Account created! Your login email is: ${data.login_email}`);
        navigate('/signin');
      } else {
        // Staff/Driver registration via backend API
        const res = await fetch(`${API_BASE_URL}/${slug}/api/staff/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            email: `${username}@${slug}.com`,
            phone,
            role: 'Driver',
            password
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed.');

        if (data.token) {
          localStorage.setItem('auth_token', data.token);
          localStorage.setItem('auth_slug', slug);
        }
        alert('Driver account created! Please sign in.');
        navigate('/signin');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
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
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-extrabold leading-tight text-left">Join LogisticHub</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">Create an account to start managing your deliveries.</p>
        </div>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4 px-6 py-4">
          {error && <p className="text-red-500 text-xs font-bold px-1 bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">{error}</p>}
          
          {/* Role Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-2">
            <button type="button" onClick={() => setRole('user')}
              className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                role === 'user' ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" : "text-slate-500")}>
              <UserCircle className="size-4" /> Client
            </button>
            <button type="button" onClick={() => setRole('driver')}
              className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all",
                role === 'driver' ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" : "text-slate-500")}>
              <Truck className="size-4" /> Driver
            </button>
          </div>

          {/* Workspace ID */}
          <div className="flex flex-col w-full">
            <label className="group flex flex-col flex-1">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Workspace ID</p>
              <div className="relative flex items-center">
                <Briefcase className="absolute left-4 text-slate-400 group-focus-within:text-orange-600 transition-colors duration-200 size-5" />
                <input type="text" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 pl-12 pr-4 text-[15px] font-normal transition-all"
                  placeholder="e.g. amongiz" required />
              </div>
            </label>
          </div>

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">First Name</p>
              <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 px-4 text-[15px] transition-all"
                placeholder="John" required />
            </div>
            <div className="flex flex-col">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Last Name</p>
              <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 px-4 text-[15px] transition-all"
                placeholder="Doe" required />
            </div>
          </div>

          {/* Username */}
          <div className="flex flex-col w-full">
            <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Username</p>
            <div className="relative flex items-center">
              <AtSign className="absolute left-4 text-slate-400 size-5" />
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 pl-12 pr-4 text-[15px] transition-all"
                placeholder="johndoe" required />
            </div>
            {slug && username && (
              <p className="text-xs text-orange-600 font-semibold mt-1 px-1">Your login: {username}@{slug}.com</p>
            )}
          </div>

          {/* Email (real email for OTP) */}
          {role === 'user' && (
            <div className="flex flex-col w-full">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Email Address <span className="text-orange-500 normal-case">(for OTP verification)</span></p>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 text-slate-400 size-5" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 pl-12 pr-4 text-[15px] transition-all"
                  placeholder="name@gmail.com" required />
              </div>
            </div>
          )}

          {/* Phone */}
          <div className="flex flex-col w-full">
            <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Phone <span className="text-slate-400 normal-case">(optional)</span></p>
            <div className="relative flex items-center">
              <Phone className="absolute left-4 text-slate-400 size-5" />
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 pl-12 pr-4 text-[15px] transition-all"
                placeholder="09xxxxxxxxx" />
            </div>
          </div>

          {/* Password */}
          <div className="flex flex-col w-full">
            <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Password</p>
            <div className="flex w-full items-stretch rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus-within:ring-2 focus-within:ring-orange-600/20 focus-within:border-orange-600 transition-all duration-200">
              <Lock className="flex items-center ml-4 text-slate-400 size-5 self-center" />
              <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                className="flex w-full min-w-0 flex-1 bg-transparent border-none focus:ring-0 h-14 placeholder:text-slate-400 pl-3 pr-2 text-[15px] text-slate-900 dark:text-slate-100"
                placeholder="Create a password" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 flex items-center justify-center px-4 hover:text-orange-600 transition-colors">
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="flex flex-col w-full">
            <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Confirm Password</p>
            <div className="flex w-full items-stretch rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus-within:ring-2 focus-within:ring-orange-600/20 transition-all">
              <Lock className="flex items-center ml-4 text-slate-400 size-5 self-center" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="flex w-full min-w-0 flex-1 bg-transparent border-none focus:ring-0 h-14 placeholder:text-slate-400 pl-3 pr-4 text-[15px] text-slate-900 dark:text-slate-100"
                placeholder="Re-enter password" required />
            </div>
          </div>

          {/* OTP field */}
          <AnimatePresence>
            {otpSent && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-xl mb-2">
                  <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">A 6-digit OTP was sent to <strong>{email}</strong>. Enter it below.</p>
                  {loginEmail && <p className="text-xs text-orange-500 mt-1">Your login will be: <strong>{loginEmail}</strong></p>}
                </div>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider pb-2 px-1">OTP Code</p>
                <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6}
                  className="flex w-full rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 px-4 text-center text-2xl font-mono tracking-[0.5em] transition-all"
                  placeholder="000000" required />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="py-4">
            <button type="submit" disabled={loading}
              className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
              <span>{loading ? 'Please wait...' : otpSent ? 'Verify & Create Account' : `Sign Up as ${role === 'driver' ? 'Driver' : 'Client'}`}</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center justify-center px-6 pb-12 pt-2">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Already have an account?{' '}
            <Link to="/signin" className="text-orange-600 font-bold hover:underline">Sign In</Link>
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
