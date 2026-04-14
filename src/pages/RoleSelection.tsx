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
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-bold text-brand-900 tracking-tight">Choose Your Role</h1>
          <p className="text-gray-500 text-lg">Select how you want to use Easy Maker</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {roles.map((role) => (
            <motion.button
              key={role.id}
              whileHover={{ y: -8 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                "relative p-10 rounded-[2.5rem] bg-white border-2 transition-all text-left group soft-shadow",
                selectedRole === role.id ? "border-brand-500 ring-8 ring-brand-50" : "border-transparent hover:border-brand-100"
              )}
            >
              <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-all", role.color, role.shadow)}>
                <role.icon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-brand-900 mb-3">{role.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{role.description}</p>
              
              {selectedRole === role.id && (
                <div className="absolute top-6 right-6 w-8 h-8 bg-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-100">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRoleSelection}
            disabled={!selectedRole || loading}
            className={cn(
              "px-16 py-5 rounded-2xl font-bold text-white transition-all flex items-center gap-4 shadow-2xl text-lg",
              selectedRole ? "bg-brand-900 hover:bg-black shadow-brand-100" : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Get Started
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
