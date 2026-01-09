import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Rate limiter general
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requetes par fenetre
  message: {
    message: 'Trop de requetes, veuillez reessayer plus tard',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter strict pour l'authentification
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 tentatives
  message: {
    message: 'Trop de tentatives de connexion, veuillez reessayer dans 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter pour la creation de ressources
export const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 heure
  max: 50, // max 50 creations par heure
  message: {
    message: 'Limite de creation atteinte, veuillez reessayer plus tard',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
