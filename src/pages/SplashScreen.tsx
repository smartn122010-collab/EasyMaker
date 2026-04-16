import { motion } from 'motion/react';
import { UtensilsCrossed } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center charcoal-gradient text-white z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-8"
      >
        <div className="bg-brand-100 p-10 rounded-[2.5rem] luxury-shadow border border-white/10">
          <UtensilsCrossed className="w-24 h-24 text-brand-500" />
        </div>
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="text-5xl font-serif font-light tracking-tight text-white"
      >
        Easy <span className="font-bold italic text-brand-500">Maker</span>
      </motion.h1>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 100 }}
        transition={{ delay: 0.8, duration: 1 }}
        className="h-px bg-brand-500/30 my-6"
      />
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-500"
      >
        Culinary Excellence Delivered
      </motion.p>
    </div>
  );
}
