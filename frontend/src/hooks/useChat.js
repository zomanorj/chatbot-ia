import { useState, useCallback, useRef, useEffect } from 'react';

// URL du backend depuis la variable d'environnement Vite (fallback localhost en développement)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Hook de communication avec le backend.
 * Gère le streaming SSE, l'annulation de requête, et les messages de la conversation active.
 *
 * @param {Array}    messages        - Messages de la conversation active (depuis useConversations)
 * @param {Function} setMessages     - Setter qui persiste dans localStorage via useConversations
 * @param {string}   conversationId  - ID de la conversation active (pour réinitialiser sur changement)
 * @param {string}   modele          - Modèle Groq à utiliser
 */
export function useChat(messages, setMessages, conversationId, modele = 'llama-3.3-70b-versatile') {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  // Référence toujours à jour vers les messages — évite les closures périmées dans sendMessage
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Annuler le streaming en cours quand on change de conversation
  useEffect(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setError(null);
  }, [conversationId]);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Annuler toute requête en cours avant d'en lancer une nouvelle
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    // Snapshot de l'historique avant envoi (pour le corps de la requête)
    const historique = messagesRef.current;
    setMessages(prev => [...prev, userMessage, assistantMessage]);

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          messages: [...historique, userMessage],
          model: modele,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur de connexion au serveur backend');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            if (dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.error) { setError(data.error); continue; }
              if (data.text) {
                setMessages(prev => prev.map(msg =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + data.text }
                    : msg
                ));
              }
            } catch (e) {
              console.warn("Erreur parsing SSE:", e);
            }
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        // Streaming annulé volontairement par l'utilisateur — pas une erreur
        return;
      }
      console.error(err);
      setError("Impossible de joindre le serveur. Assurez-vous que le backend (port 3001) est bien démarré.");
      // Retirer le message vide de l'assistant en cas d'erreur de connexion
      setMessages(prev => prev.filter(msg => msg.id !== assistantId));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, setMessages, modele]);

  const arreterGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  const clearChat = useCallback(() => {
    if (window.confirm('Effacer tous les messages de cette conversation ? Cette action est irréversible.')) {
      setMessages([]);
      setError(null);
    }
  }, [setMessages]);

  return { isLoading, error, sendMessage, clearChat, arreterGeneration };
}
