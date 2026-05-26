import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, MessageSquare, Trash2, Bot } from 'lucide-react';

function grouperParDate(conversations) {
  const groupes = {};
  const maintenant = new Date();

  for (const conv of conversations) {
    const date = new Date(conv.updated_at);
    const diffJours = Math.floor((maintenant - date) / (1000 * 60 * 60 * 24));

    let groupe;
    if (diffJours === 0) groupe = "Aujourd'hui";
    else if (diffJours === 1) groupe = 'Hier';
    else if (diffJours < 7) groupe = 'Cette semaine';
    else if (diffJours < 30) groupe = 'Ce mois-ci';
    else groupe = 'Plus ancien';

    if (!groupes[groupe]) groupes[groupe] = [];
    groupes[groupe].push(conv);
  }

  const ordre = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Ce mois-ci', 'Plus ancien'];
  return ordre.filter(g => groupes[g]).map(g => ({ label: g, items: groupes[g] }));
}

function ItemConversation({ conv, active, onSelect, onSupprimer }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full group flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-all duration-150 ${
        active
          ? 'bg-brand-600/20 text-slate-200 border border-brand-500/20'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
      }`}
    >
      <MessageSquare size={14} className="flex-none opacity-60 shrink-0" />
      <span className="flex-1 text-sm truncate">{conv.titre}</span>
      <span
        role="button"
        tabIndex={0}
        onClick={onSupprimer}
        onKeyDown={(e) => e.key === 'Enter' && onSupprimer(e)}
        className="flex-none opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-all cursor-pointer"
        title="Supprimer"
      >
        <Trash2 size={12} />
      </span>
    </button>
  );
}

export default function Sidebar({
  conversations,
  conversationActive,
  ouverte,
  onFermer,
  onNouvelleConversation,
  onChangerConversation,
  onSupprimerConversation,
  onSupprimerToutes,
}) {
  const groupes = grouperParDate(conversations);

  const handleNouvelleConversation = () => {
    onNouvelleConversation();
    onFermer();
  };

  const handleChangerConversation = (id) => {
    onChangerConversation(id);
    onFermer();
  };

  const handleSupprimerConversation = (e, id) => {
    e.stopPropagation();
    onSupprimerConversation(id);
  };

  const handleSupprimerToutes = () => {
    if (window.confirm('Effacer toutes les conversations ? Cette action est irréversible.')) {
      onSupprimerToutes();
      onFermer();
    }
  };

  return (
    <>
      {/* Overlay sombre sur mobile */}
      <AnimatePresence>
        {ouverte && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onFermer}
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Panneau latéral */}
      <motion.aside
        initial={false}
        animate={{ x: ouverte ? 0 : '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 h-full w-[260px] bg-slate-900 border-r border-white/5 z-30 flex flex-col shadow-2xl"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-brand-400" />
            <span className="font-semibold text-slate-200 text-sm">AI Chat</span>
          </div>
          <button
            onClick={onFermer}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
            title="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Bouton nouvelle conversation */}
        <div className="p-3">
          <button
            onClick={handleNouvelleConversation}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/20 hover:border-brand-500/40 transition-all duration-200 text-sm font-medium"
          >
            <Plus size={16} />
            Nouvelle conversation
          </button>
        </div>

        {/* Liste des conversations groupées par date */}
        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
          {groupes.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">Aucune conversation</p>
          ) : (
            groupes.map(({ label, items }) => (
              <div key={label}>
                <p className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
                  {label}
                </p>
                {items.map(conv => (
                  <ItemConversation
                    key={conv.id}
                    conv={conv}
                    active={conv.id === conversationActive?.id}
                    onSelect={() => handleChangerConversation(conv.id)}
                    onSupprimer={(e) => handleSupprimerConversation(e, conv.id)}
                  />
                ))}
              </div>
            ))
          )}
        </div>

        {/* Pied de page — effacer tout */}
        {conversations.length > 1 && (
          <div className="p-3 border-t border-white/5">
            <button
              onClick={handleSupprimerToutes}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 text-sm"
            >
              <Trash2 size={14} />
              Effacer tout
            </button>
          </div>
        )}
      </motion.aside>
    </>
  );
}
