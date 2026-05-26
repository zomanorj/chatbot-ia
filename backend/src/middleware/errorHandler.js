/**
 * Middleware global de gestion des erreurs
 * Attrape toutes les erreurs jetées ou transmises via next(error) dans l'application 
 * et renvoie une réponse JSON propre au frontend.
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Erreur interceptée par le middleware:', err.message);
  
    // On définit le code de statut HTTP. 500 correspond à une erreur interne du serveur.
    const statusCode = err.status || 500;
    const message = err.message || 'Une erreur interne du serveur est survenue';
  
    res.status(statusCode).json({
      error: {
        message: message,
        status: statusCode,
        // On inclut la stack trace (le détail de l'erreur) uniquement en mode développement
        // pour des raisons de sécurité (on ne veut pas exposer l'architecture interne en production)
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      }
    });
  };
  
