import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'ai_conversations';
const ACTIVE_KEY = 'ai_active_id';

function genererTitre(texte) {
  const t = texte.trim();
  if (t.length <= 45) return t;
  const coupe = t.lastIndexOf(' ', 45);
  return (coupe > 0 ? t.slice(0, coupe) : t.slice(0, 45)) + '…';
}

function creerConversation() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    titre: 'Nouvelle conversation',
    messages: [],
    created_at: now,
    updated_at: now,
  };
}

export function useConversations() {
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return parsed.length > 0 ? parsed : [creerConversation()];
    } catch {
      return [creerConversation()];
    }
  });

  const [activeId, setActiveId] = useState(() => {
    try { return localStorage.getItem(ACTIVE_KEY) || null; }
    catch { return null; }
  });

  // Dériver la conversation active (fallback sur la première si l'ID est invalide)
  const conversationActive = conversations.find(c => c.id === activeId) || conversations[0] || null;

  // Persister les conversations dans localStorage à chaque changement
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations)); }
    catch { /* localStorage plein — ignorer silencieusement */ }
  }, [conversations]);

  // Persister l'ID actif
  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {}
  }, [activeId]);

  // Corriger l'activeId si la conversation active a été supprimée
  useEffect(() => {
    if (conversations.length > 0 && !conversations.find(c => c.id === activeId)) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  const messages = conversationActive?.messages || [];

  const nouvelleConversation = useCallback(() => {
    const conv = creerConversation();
    setConversations(prev => [conv, ...prev]);
    setActiveId(conv.id);
    return conv.id;
  }, []);

  const changerConversation = useCallback((id) => setActiveId(id), []);

  const supprimerConversation = useCallback((id) => {
    setConversations(prev => {
      const restantes = prev.filter(c => c.id !== id);
      if (restantes.length === 0) {
        const nouvelle = creerConversation();
        setActiveId(nouvelle.id);
        return [nouvelle];
      }
      if (id === activeId) setActiveId(restantes[0].id);
      return restantes;
    });
  }, [activeId]);

  // Met à jour les messages de la conversation active et génère le titre automatiquement
  const setMessages = useCallback((updater) => {
    if (!conversationActive) return;
    const convId = conversationActive.id;
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      const nouveauxMessages = typeof updater === 'function' ? updater(c.messages) : updater;
      const premierUser = nouveauxMessages.find(m => m.role === 'user');
      const titre = (c.titre === 'Nouvelle conversation' && premierUser)
        ? genererTitre(premierUser.content)
        : c.titre;
      return { ...c, messages: nouveauxMessages, titre, updated_at: new Date().toISOString() };
    }));
  }, [conversationActive]);

  const supprimerToutes = useCallback(() => {
    const conv = creerConversation();
    setConversations([conv]);
    setActiveId(conv.id);
  }, []);

  return {
    conversations,
    conversationActive,
    activeId,
    messages,
    setMessages,
    nouvelleConversation,
    changerConversation,
    supprimerConversation,
    supprimerToutes,
  };
}
