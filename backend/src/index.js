import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import chatRoutes from './routes/chat.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Protection des headers HTTP (XSS, clickjacking, etc.)
app.use(helmet());

// CORS : frontend local + URL de production configurée dans .env
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL,
    /https:\/\/.*\.vercel\.app$/,
  ].filter(Boolean)
}));

app.use(express.json());

// Rate limiting : 20 requêtes par minute par IP pour protéger les crédits API
const limiteChat = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Trop de requêtes. Attendez 1 minute avant de réessayer.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/chat', limiteChat);
app.use('/api/chat', chatRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API opérationnelle' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
});
