import express from 'express';
import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const MAX_MESSAGES = 50;
const MAX_CHARS = 10000;

// Modèles disponibles — validés côté serveur pour éviter l'injection de modèles non autorisés
const MODELES_AUTORISES = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]);

if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️ ATTENTION: La variable GROQ_API_KEY n'est pas définie. Les appels à l'API échoueront.");
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * POST /api/chat
 * Reçoit l'historique des messages + le modèle choisi
 * Renvoie la réponse de l'IA en streaming (SSE)
 */
router.post('/', async (req, res, next) => {
  try {
    const { messages, model } = req.body;

    // Validation des entrées
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Format invalide. Un tableau de 'messages' est requis." });
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `Maximum ${MAX_MESSAGES} messages par conversation.` });
    }
    const totalChars = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    if (totalChars > MAX_CHARS) {
      return res.status(400).json({ error: `Conversation trop longue (max ${MAX_CHARS} caractères).` });
    }

    if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'dummy_key') {
      return res.status(500).json({ error: "La clé API Groq n'est pas configurée sur le serveur." });
    }

    // Utiliser le modèle demandé ou le modèle par défaut si non autorisé
    const modeleChoisi = MODELES_AUTORISES.has(model) ? model : 'llama-3.3-70b-versatile';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    const systemMessage = {
      role: 'system',
      content: "Tu es un assistant IA expert, amical et très compétent en développement informatique. Tu réponds de manière claire, concise, et tu formates tes réponses en Markdown pour une meilleure lisibilité. Si tu fournis du code, ajoute des commentaires explicatifs."
    };

    const formattedMessages = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))
    ];

    const stream = await groq.chat.completions.create({
      model: modeleChoisi,
      messages: formattedMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ text: content })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (error) {
    console.error("Erreur de l'API Groq:", error);
    if (!res.headersSent) {
      next(error);
    } else {
      const errorMessage = error.error?.error?.message || error.message || "Le modèle d'IA a rencontré un problème.";
      res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
      res.end();
    }
  }
});

export default router;
