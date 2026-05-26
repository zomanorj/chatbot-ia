import React, { useState } from 'react';
import { Bot, Menu, Plus, ChevronDown } from 'lucide-react';
import { useConversations } from './hooks/useConversations';
import { useChat } from './hooks/useChat';
import ChatWindow from './components/ChatWindow';
import InputBar from './components/InputBar';
import Sidebar from './components/Sidebar';

const MODELES = [
  { id: 'llama-3.3-70b-versatile', label: 'LLaMA 3.3 70B', description: 'Puissant · Recommandé' },
  { id: 'llama-3.1-8b-instant',    label: 'LLaMA 3.1 8B',  description: 'Rapide · Léger' },
  { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B',  description: 'Contexte long' },
  { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',    description: 'Google · Efficace' },
];

function App() {
  const [sidebarOuverte, setSidebarOuverte] = useState(false);
  const [modele, setModele] = useState('llama-3.3-70b-versatile');
  const [modeleMenuOuvert, setModeleMenuOuvert] = useState(false);

  const {
    conversations,
    conversationActive,
    activeId,
    messages,
    setMessages,
    nouvelleConversation,
    changerConversation,
    supprimerConversation,
    supprimerToutes,
  } = useConversations();

  const { isLoading, error, sendMessage, clearChat, arreterGeneration } = useChat(
    messages,
    setMessages,
    activeId,
    modele
  );

  const modeleActuel = MODELES.find(m => m.id === modele) || MODELES[0];

  return (
    <div className="relative flex h-screen bg-slate-950 overflow-hidden font-sans">

      {/* Sidebar des conversations */}
      <Sidebar
        conversations={conversations}
        conversationActive={conversationActive}
        ouverte={sidebarOuverte}
        onFermer={() => setSidebarOuverte(false)}
        onNouvelleConversation={nouvelleConversation}
        onChangerConversation={changerConversation}
        onSupprimerConversation={supprimerConversation}
        onSupprimerToutes={supprimerToutes}
      />

      {/* Zone principale */}
      <div className="flex flex-col flex-1 h-screen overflow-hidden">

        {/* Orbes animées en arrière-plan */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
          <div className="absolute top-[20%] right-[-10%] w-80 h-80 bg-indigo-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-[-20%] left-[20%] w-[500px] h-[500px] bg-purple-600/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Header */}
        <header className="relative flex-none flex items-center justify-between px-4 sm:px-6 py-4 glass-panel border-b border-white/5 z-10">
          <div className="flex items-center gap-3">
            {/* Bouton burger — ouvre la sidebar */}
            <button
              onClick={() => setSidebarOuverte(true)}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Ouvrir les conversations"
            >
              <Menu size={20} />
            </button>

            <div className="relative p-2.5 bg-gradient-to-br from-brand-500/20 to-purple-500/20 rounded-xl text-brand-400 border border-white/10 shadow-lg backdrop-blur-md">
              <Bot size={24} className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            </div>

            <div className="min-w-0">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-100 to-slate-400 tracking-tight truncate max-w-[180px] sm:max-w-xs">
                {conversationActive?.titre || 'Assistant IA'}
              </h1>
              <p className="text-xs text-brand-300/80 font-medium tracking-wide uppercase mt-0.5">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sélecteur de modèle */}
            <div className="relative">
              <button
                onClick={() => setModeleMenuOuvert(!modeleMenuOuvert)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/30 hover:bg-slate-800/60 border border-white/5 rounded-lg transition-all duration-200"
              >
                <span className="hidden sm:inline">{modeleActuel.label}</span>
                <ChevronDown size={12} />
              </button>

              {modeleMenuOuvert && (
                <>
                  {/* Clic extérieur pour fermer */}
                  <div className="fixed inset-0 z-10" onClick={() => setModeleMenuOuvert(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-slate-800 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
                    {MODELES.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setModele(m.id); setModeleMenuOuvert(false); }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-slate-700/60 transition-colors ${m.id === modele ? 'bg-brand-600/20' : ''}`}
                      >
                        <div className="text-sm font-medium text-slate-200">{m.label}</div>
                        <div className="text-xs text-slate-500">{m.description}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Nouvelle conversation */}
            <button
              onClick={nouvelleConversation}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Nouvelle conversation"
            >
              <Plus size={20} />
            </button>
          </div>
        </header>

        {/* Bannière d'erreur */}
        {error && (
          <div className="relative z-10 bg-red-500/10 backdrop-blur-md border-b border-red-500/20 px-6 py-3 text-red-400 text-sm flex justify-center text-center font-medium shadow-lg">
            ⚠️ {error}
          </div>
        )}

        {/* Zone de chat */}
        <main className="relative flex-1 overflow-hidden z-10">
          <ChatWindow messages={messages} isLoading={isLoading} />
        </main>

        {/* Barre de saisie flottante */}
        <footer className="relative flex-none px-4 pb-6 pt-2 z-20 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
          <div className="max-w-4xl mx-auto">
            <InputBar
              onSendMessage={sendMessage}
              isLoading={isLoading}
              onStop={arreterGeneration}
            />
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500/50"></div>
              AI Chat — Propulsé par LLaMA 3.3 via Groq
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500/50"></div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
