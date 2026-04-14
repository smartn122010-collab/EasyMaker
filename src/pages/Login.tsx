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
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] soft-shadow overflow-hidden border border-brand-50"
      >
        <div className="p-10">
          <div className="text-center mb-10 space-y-2">
            <h1 className="text-4xl font-bold text-brand-900 tracking-tight">
              {isSignUp ? 'Join the Foodies' : 'Welcome Back'}
            </h1>
            <p className="text-gray-400">
              {isSignUp ? 'Create your account to get started' : 'Sign in to satisfy your cravings'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {isSignUp && (
              <>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="relative group">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="Admin ID (Optional)"
                    className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                    value={easyMakerId}
                    onChange={(e) => setEasyMakerId(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
              <input
                type="email"
                placeholder="Email Address"
                required
                className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
              <input
                type="password"
                placeholder="Password"
                required
                className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {isSignUp && (
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-brand-500 transition-colors" />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-surface-50 border border-transparent rounded-2xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none transition-all"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-brand-900 text-white font-bold py-4 rounded-2xl shadow-xl shadow-brand-100 transition-all flex items-center justify-center gap-3 group mt-4"
            >
              {loading ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          <div className="relative my-10">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-bold">
              <span className="px-4 bg-white text-gray-300">Or continue with</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-100 hover:border-brand-100 text-brand-900 font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-4 soft-shadow"
          >
            <Chrome className="w-6 h-6 text-brand-500" />
            Google Account
          </motion.button>

          <div className="mt-10 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-brand-500 font-bold hover:underline transition-all"
            >
              {isSignUp ? 'Already have an account? Sign In' : "New here? Create an account"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
