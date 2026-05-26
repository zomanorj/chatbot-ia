# AI Chat — Full-Stack Conversational Interface

**Live demo:** [chatbot-ia-gilt.vercel.app](https://chatbot-ia-gilt.vercel.app)

A full-stack conversational AI application with real-time token streaming, persistent multi-conversation management, and Markdown rendering.

## Features

- **Real-time streaming** via Server-Sent Events (SSE) — token-by-token response delivery
- **Multi-conversation management** — sidebar with persistent history stored in localStorage
- **Automatic conversation titles** generated from the first user message
- **Abort support** — cancel an ongoing generation via AbortController
- **Message copying** — one-click copy with visual feedback
- **Timestamps** on each message with full date tooltip
- **Model selection** — LLaMA 3.3 70B, LLaMA 3.1 8B, Mixtral 8x7B, Gemma 2 9B
- **Markdown rendering** — formatted code blocks, lists, tables
- **Keyboard shortcuts** — `Enter` to send, `Shift+Enter` for line break
- **Glassmorphism UI** with dark mode and smooth animations

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Lucide React |
| Backend | Node.js, Express, Helmet, express-rate-limit |
| AI Provider | LLaMA 3.3 70B via [Groq API](https://console.groq.com) |
| Transport | Server-Sent Events (SSE) |

## Project Structure

```
chatbot-ia/
├── backend/
│   ├── src/
│   │   ├── index.js                   # Express server, CORS, Helmet, rate limiting
│   │   ├── routes/chat.js             # SSE endpoint, input validation, model selection
│   │   └── middleware/errorHandler.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── hooks/
    │   │   ├── useChat.js             # SSE streaming, AbortController
    │   │   └── useConversations.js    # Multi-conversation state, localStorage
    │   ├── components/
    │   │   ├── Sidebar.jsx
    │   │   ├── ChatWindow.jsx
    │   │   ├── MessageBubble.jsx
    │   │   ├── InputBar.jsx
    │   │   └── TypingIndicator.jsx
    │   └── App.jsx
    ├── .env.example
    └── package.json
```

## Prerequisites

- Node.js 18+
- A Groq API key — available at [console.groq.com](https://console.groq.com)

## Local Setup

### Backend

```bash
cd backend
npm install
```

Copy `.env.example` to `.env` and fill in your credentials:

```env
PORT=3001
GROQ_API_KEY=your_groq_api_key
FRONTEND_URL=http://localhost:5173
```

```bash
npm run dev
```

The API server will be available at `http://localhost:3001`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

## Deployment

### Backend — Render

1. Push the repository to GitHub (ensure `.env` is listed in `.gitignore`)
2. Create a new **Web Service** on [Render](https://render.com) and connect the repository
3. Set the following configuration:
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add the required environment variables:
   - `GROQ_API_KEY` — your Groq API key
   - `FRONTEND_URL` — your Vercel frontend URL (set after frontend deployment)
5. Note the service URL provided by Render (e.g., `https://your-app.onrender.com`)

### Frontend — Vercel

1. Create a new project on [Vercel](https://vercel.com) and import the repository
2. Set Root Directory to `frontend`
3. Add the environment variable:
   - `VITE_API_URL` — your Render backend URL
4. Deploy

## License

MIT
