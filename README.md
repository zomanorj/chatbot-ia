# AI Chat — Chatbot Full-Stack

Chatbot conversationnel full-stack avec streaming en temps réel, multi-conversations persistantes et interface moderne style ChatGPT.

![Aperçu de l'interface](https://placehold.co/800x400/0f172a/818cf8?text=AI+Chat+—+LLaMA+3.3+via+Groq)

## Fonctionnalités

- **Streaming en temps réel** (Server-Sent Events) — réponse mot par mot comme ChatGPT
- **Multi-conversations** — sidebar avec historique persistant (localStorage)
- **Titre auto-généré** pour chaque conversation depuis le premier message
- **Bouton Stop** — annule la génération en cours (AbortController)
- **Copier les messages** — icône au survol avec feedback visuel
- **Timestamps** sur chaque message avec tooltip date complète
- **Sélection du modèle** — LLaMA 3.3 70B, LLaMA 3.1 8B, Mixtral 8x7B, Gemma 2 9B
- **Support Markdown** — code formaté, listes, tableaux
- **Raccourcis clavier** — `Entrée` pour envoyer, `Shift+Entrée` pour saut de ligne
- **Design Glassmorphism** avec animations et mode sombre

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Lucide React |
| Backend | Node.js, Express, Helmet, express-rate-limit |
| IA | LLaMA 3.3 70B via [API Groq](https://console.groq.com) (gratuit) |
| Streaming | Server-Sent Events (SSE) |

## Architecture

```
chatbot-ia/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express + CORS + Helmet + Rate limiting
│   │   ├── routes/chat.js    # Route SSE + validation + sélection modèle
│   │   └── middleware/errorHandler.js
│   ├── .env.example          # Template variables d'environnement
│   └── package.json
└── frontend/
    ├── src/
    │   ├── hooks/
    │   │   ├── useChat.js           # Streaming SSE + AbortController
    │   │   └── useConversations.js  # Multi-conversations + localStorage
    │   ├── components/
    │   │   ├── Sidebar.jsx      # Navigation entre conversations
    │   │   ├── ChatWindow.jsx   # Fenêtre de chat avec auto-scroll
    │   │   ├── MessageBubble.jsx # Bulles avec copier + timestamp
    │   │   ├── InputBar.jsx     # Saisie + bouton Stop
    │   │   └── TypingIndicator.jsx
    │   └── App.jsx             # Composition + sélection modèle
    ├── .env.example
    └── package.json
```

## Installation en local

### 1. Backend

```bash
cd backend
npm install
```

Copier `.env.example` en `.env` et ajouter votre clé API Groq :

```env
PORT=3001
GROQ_API_KEY=votre_cle_groq_ici
FRONTEND_URL=http://localhost:5173
```

```bash
npm run dev
```

Le backend tourne sur `http://localhost:3001`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

L'application est accessible sur `http://localhost:5173`.

## Obtenir une clé API Groq (gratuit)

1. Créer un compte sur [console.groq.com](https://console.groq.com)
2. Aller dans **API Keys** → **Create API Key**
3. Copier la clé (`gsk_...`) dans `backend/.env`

Les modèles disponibles via Groq sont **entièrement gratuits** avec des limites généreuses.

## Déploiement

### Backend sur Render

1. Pousser le code sur GitHub (vérifier que `.env` est dans `.gitignore`)
2. Créer un compte sur [Render.com](https://render.com)
3. **New +** → **Web Service** → connecter le dépôt GitHub
4. Configuration :
   - Root Directory : `backend`
   - Build Command : `npm install`
   - Start Command : `npm start`
5. Variables d'environnement :
   - `GROQ_API_KEY` → votre clé API
   - `FRONTEND_URL` → URL Vercel de votre frontend (après déploiement)
6. Copier l'URL fournie par Render (ex: `https://mon-backend.onrender.com`)

### Frontend sur Vercel

1. Créer un compte sur [Vercel.com](https://vercel.com)
2. **Add New** → **Project** → importer le dépôt GitHub
3. Root Directory : `frontend`
4. Variables d'environnement :
   - `VITE_API_URL` → URL de votre backend Render
5. **Deploy**

---

*Projet réalisé avec React, Node.js et l'API Groq.*
