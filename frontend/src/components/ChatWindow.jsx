import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function ChatWindow({ messages, isLoading }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="h-full overflow-y-auto px-4 sm:px-6 py-8">
      <div className="max-w-4xl mx-auto space-y-8 flex flex-col">
        
        <AnimatePresence mode="popLayout">
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center mt-32 relative"
            >
              <div className="inline-block p-4 rounded-3xl bg-brand-500/10 border border-brand-500/20 backdrop-blur-md mb-6 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                <span className="text-4xl">✨</span>
              </div>
              <h2 className="text-3xl font-bold mb-3 text-slate-100 tracking-tight">Bonjour !</h2>
              <p className="text-slate-400 text-lg">Je suis là pour vous aider avec votre code ou vos questions.</p>
            </motion.div>
          )}

          {messages.map((message, index) => (
            (message.role === 'assistant' && !message.content && isLoading) ? null : (
              <MessageBubble key={message.id} message={message} isLast={index === messages.length - 1} />
            )
          ))}

          {isLoading && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <motion.div
              key="typing-indicator"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <TypingIndicator />
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} className="h-4" />
      </div>
    </div>
  );
}
