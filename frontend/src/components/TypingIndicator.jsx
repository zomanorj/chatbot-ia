import React from 'react';
import { Bot } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TypingIndicator() {
  return (
    <div className="flex gap-4 flex-row w-full">
      <div className="relative flex-none w-10 h-10 rounded-full bg-slate-800/80 text-brand-300 border border-white/10 flex items-center justify-center shadow-lg backdrop-blur-md">
        <Bot size={18} />
      </div>
      
      <div className="bg-slate-800/60 border border-white/10 rounded-[24px] rounded-tl-[4px] px-5 py-4 flex items-center gap-1.5 h-[52px] shadow-xl backdrop-blur-md">
        <motion.div 
          animate={{ y: [0, -5, 0] }} 
          transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0 }}
          className="w-2 h-2 rounded-full bg-brand-400"
        />
        <motion.div 
          animate={{ y: [0, -5, 0] }} 
          transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.15 }}
          className="w-2 h-2 rounded-full bg-brand-400"
        />
        <motion.div 
          animate={{ y: [0, -5, 0] }} 
          transition={{ repeat: Infinity, duration: 0.8, ease: "easeInOut", delay: 0.3 }}
          className="w-2 h-2 rounded-full bg-brand-400"
        />
      </div>
    </div>
  );
}
