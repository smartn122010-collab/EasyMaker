import { motion } from 'motion/react';
import { UtensilsCrossed } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-orange-500 text-white z-50">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="mb-4"
      >
        <div className="bg-white p-6 rounded-full shadow-2xl">
          <UtensilsCrossed className="w-20 h-20 text-orange-500" />
        </div>
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-4xl font-bold tracking-tighter"
      >
        Easy Maker
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.8 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="mt-2 text-lg font-medium"
      >
        Food Delivery & Ordering
      </motion.p>
    </div>
  );
}
