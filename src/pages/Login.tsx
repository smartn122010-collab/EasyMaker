import React, { useState } from 'react';
import { auth, db, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { LogIn, Mail, Lock, User, Chrome, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [easyMakerId, setEasyMakerId] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const playNotificationSound = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(e => console.log("Audio play failed:", e));
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      playNotificationSound();
      toast.success(`Welcome back, ${user.displayName || 'Foodie'}!`, {
        description: "Ready to order something delicious?"
      });

      if (!userDoc.exists()) {
        // New user, redirect to role selection
        navigate('/role-selection');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error("Passwords don't match");
        }
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName: name });
        
        playNotificationSound();
        toast.success("Account created successfully!");

        // If it's an admin signup (has easyMakerId), set role immediately
        const role = easyMakerId ? 'admin' : null;
        
        if (role === 'admin') {
          await setDoc(doc(db, 'users', result.user.uid), {
            uid: result.user.uid,
            name,
            email,
            role: 'admin',
            easyMakerId: easyMakerId || null,
            createdAt: new Date().toISOString()
          });
          navigate('/');
        } else {
          // For non-admins, we'll let them choose their role in RoleSelection
          // We don't create the document here to avoid the immutable role rule
          navigate('/role-selection');
        }
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        playNotificationSound();
        toast.success(`Welcome back!`, {
          description: "Ready to order something delicious?"
        });
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-luxury rounded-[3rem] overflow-hidden relative z-10"
      >
        <div className="p-10 sm:p-12">
          <div className="text-center mb-12 space-y-3">
            <div className="inline-block px-4 py-1.5 bg-brand-500/10 text-brand-500 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4">
              Premium Experience
            </div>
            <h1 className="text-4xl font-serif font-light text-brand-900 tracking-tight leading-tight">
              {isSignUp ? 'Join the' : 'Welcome to'} <br />
              <span className="font-bold italic text-brand-500">Easy Maker</span>
            </h1>
            <p className="text-sm text-gray-400 font-medium">
              {isSignUp ? 'Crafting your culinary journey' : 'Sign in to satisfy your refined cravings'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-5">
            {isSignUp && (
              <>
                <div className="relative group">
                  <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    className="w-full pl-14 pr-6 py-4 bg-white/50 border border-transparent rounded-2xl focus:bg-white focus:ring-1 focus:ring-brand-500/30 outline-none transition-all placeholder:text-gray-300 text-sm font-medium"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Admin ID (Optional)"
                    className="w-full pl-14 pr-6 py-4 bg-white/50 border border-transparent rounded-2xl focus:bg-white focus:ring-1 focus:ring-brand-500/30 outline-none transition-all placeholder:text-gray-300 text-sm font-medium"
                    value={easyMakerId}
                    onChange={(e) => setEasyMakerId(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
              <input
                type="email"
                placeholder="Email Address"
                required
                className="w-full pl-14 pr-6 py-4 bg-white/50 border border-transparent rounded-2xl focus:bg-white focus:ring-1 focus:ring-brand-500/30 outline-none transition-all placeholder:text-gray-300 text-sm font-medium"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full pl-14 pr-6 py-4 bg-white/50 border border-transparent rounded-2xl focus:bg-white focus:ring-1 focus:ring-brand-500/30 outline-none transition-all placeholder:text-gray-300 text-sm font-medium"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {isSignUp && (
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  required
                  className="w-full pl-14 pr-6 py-4 bg-white/50 border border-transparent rounded-2xl focus:bg-white focus:ring-1 focus:ring-brand-500/30 outline-none transition-all placeholder:text-gray-300 text-sm font-medium"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full charcoal-gradient text-white font-bold py-5 rounded-2xl luxury-shadow transition-all flex items-center justify-center gap-3 group mt-6"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="tracking-widest uppercase text-xs">{isSignUp ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <div className="relative my-12">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black">
              <span className="px-6 bg-white/50 backdrop-blur-sm text-gray-300">Or continue with</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-100 hover:border-brand-500/30 text-brand-900 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-4 luxury-shadow"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="tracking-widest uppercase text-[10px]">Google Account</span>
          </motion.button>

          <div className="mt-12 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-brand-500 font-black text-[10px] uppercase tracking-[0.2em] hover:text-brand-600 transition-all"
            >
              {isSignUp ? 'Already have an account? Sign In' : "New here? Create an account"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
