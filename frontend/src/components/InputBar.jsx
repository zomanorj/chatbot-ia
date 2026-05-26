import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Square } from 'lucide-react';
import { motion } from 'framer-motion';

export default function InputBar({ onSendMessage, isLoading, onStop }) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize du textarea selon le contenu
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      // Redonner le focus au textarea pour enchaîner les questions sans re-cliquer
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <motion.form
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 20 }}
      onSubmit={handleSubmit}
      className={`relative flex items-end gap-3 glass-panel rounded-[32px] p-2 transition-all duration-300 ${
        isFocused
          ? 'ring-2 ring-brand-500/50 border-brand-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)] bg-slate-900/80'
          : 'bg-slate-900/50 border-white/5 shadow-xl'
      }`}
    >
      <div className="flex-1 pl-4 py-1">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={isLoading ? 'Génération en cours...' : 'Posez votre question... (Entrée pour envoyer)'}
          disabled={isLoading}
          className="w-full max-h-[200px] bg-transparent text-slate-100 placeholder-slate-500 py-2 outline-none resize-none overflow-y-auto font-sans disabled:opacity-50 text-[15px] leading-relaxed"
          rows="1"
        />
      </div>

      {isLoading ? (
        /* Bouton Stop — visible uniquement pendant la génération */
        <button
          type="button"
          onClick={onStop}
          className="flex-none p-3.5 m-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Arrêter la génération"
        >
          <Square size={18} fill="currentColor" />
        </button>
      ) : (
        /* Bouton Envoyer */
        <button
          type="submit"
          disabled={!input.trim()}
          className="flex-none p-3.5 m-0.5 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 transition-all duration-300 hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] disabled:shadow-none hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Envoyer"
        >
          <SendHorizontal size={20} className={!input.trim() ? '' : 'translate-x-[-1px]'} />
        </button>
      )}
    </motion.form>
  );
}
