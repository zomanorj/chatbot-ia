import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

function formaterHeure(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formaterDateComplete(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function MessageBubble({ message, isLast }) {
  const isUser = message.role === 'user';
  const [copie, setCopie] = useState(false);

  const copierMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {}
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} w-full group`}
    >
      {/* Avatar avec effet glow */}
      <div className={`relative flex-none w-10 h-10 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md ${
        isUser
          ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
          : 'bg-slate-800/80 text-brand-300 border border-white/10'
      }`}>
        {isUser ? <User size={18} /> : <Bot size={18} />}
        <div className={`absolute inset-0 rounded-full blur-md opacity-40 -z-10 ${isUser ? 'bg-brand-500' : 'bg-slate-500'}`}></div>
      </div>

      {/* Colonne bulle + timestamp */}
      <div className={`max-w-[85%] sm:max-w-[75%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>

        {/* Bulle de message */}
        <div className={`relative px-5 py-4 shadow-xl backdrop-blur-md transition-all duration-300 ${
          isUser
            ? 'bg-gradient-to-br from-brand-600 to-brand-700 text-white rounded-[24px] rounded-tr-[4px] border border-brand-500/30'
            : 'bg-slate-800/60 border border-white/10 text-slate-200 rounded-[24px] rounded-tl-[4px]'
        }`}>
          {isUser ? (
            <div className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</div>
          ) : (
            <div className="prose prose-invert max-w-none text-[15px]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Bouton copier — uniquement sur les messages de l'assistant avec du contenu */}
          {!isUser && message.content && (
            <button
              onClick={copierMessage}
              title={copie ? 'Copié !' : 'Copier le message'}
              className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 hover:bg-slate-700/60 transition-all duration-200"
            >
              {copie
                ? <Check size={13} className="text-green-400" />
                : <Copy size={13} />
              }
            </button>
          )}
        </div>

        {/* Timestamp avec tooltip date complète */}
        {message.created_at && (
          <time
            className="text-xs text-slate-600 px-1 select-none"
            title={formaterDateComplete(message.created_at)}
          >
            {formaterHeure(message.created_at)}
          </time>
        )}
      </div>
    </motion.div>
  );
}
