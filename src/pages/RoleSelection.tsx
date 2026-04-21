import { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { User, Truck, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleSelection = async () => {
    if (!selectedRole || !auth.currentUser) return;
    
    setLoading(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        name: auth.currentUser.displayName || 'User',
        email: auth.currentUser.email,
        role: selectedRole,
        profilePicture: auth.currentUser.photoURL || null,
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    {
      id: 'customer',
      title: 'Customer',
      description: 'Order delicious food delivered to your door.',
      icon: User,
      color: 'bg-brand-500',
      shadow: 'shadow-brand-100'
    },
    {
      id: 'driver',
      title: 'Delivery Driver',
      description: 'Earn money by delivering orders to customers.',
      icon: Truck,
      color: 'bg-brand-900',
      shadow: 'shadow-brand-100'
    },
    {
      id: 'admin',
      title: 'Admin',
      description: 'Manage menu items, orders, and restaurant operations.',
      icon: ShieldCheck,
      color: 'bg-gray-900',
      shadow: 'shadow-gray-100'
    }
  ];

  return (
    <div className="min-h-screen bg-brand-100 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-20 space-y-6">
          <h1 className="text-6xl font-serif font-light text-brand-900 tracking-tight leading-tight">
            Choose Your <span className="font-bold italic text-brand-500">Role</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Select your path in the Easy Maker ecosystem</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {roles.map((role) => (
            <motion.button
              key={role.id}
              whileHover={{ y: -12 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "relative p-12 rounded-[3.5rem] bg-white transition-all text-left group luxury-shadow border",
                selectedRole === role.id ? "border-brand-500 ring-1 ring-brand-500/20" : "border-brand-50 hover:border-brand-100"
              )}
            >
              <div className={cn("w-24 h-24 rounded-[2rem] flex items-center justify-center mb-10 transition-all luxury-shadow", 
                role.id === 'customer' ? 'charcoal-gradient' : 
                role.id === 'driver' ? 'charcoal-gradient' : 'charcoal-gradient')}>
                <role.icon className="w-10 h-10 text-brand-500" />
              </div>
              <h3 className="text-3xl font-serif font-light text-brand-900 mb-4 tracking-tight">{role.title}</h3>
              <p className="text-gray-400 text-sm font-medium leading-relaxed mb-4">{role.description}</p>
              
              {selectedRole === role.id && (
                <div className="absolute top-8 right-8 w-10 h-10 charcoal-gradient rounded-2xl flex items-center justify-center luxury-shadow">
                  <CheckCircle2 className="w-6 h-6 text-brand-500" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        <div className="mt-20 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRoleSelection}
            disabled={!selectedRole || loading}
            className={cn(
              "px-20 py-6 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-white transition-all flex items-center gap-6 luxury-shadow",
              selectedRole ? "charcoal-gradient hover:scale-105" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Continue Journey
                <ArrowRight className="w-6 h-6 text-brand-500" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
