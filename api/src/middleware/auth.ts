import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/base.service';

const JWT_SECRET = process.env.JWT_SECRET || 'etnair_secret_key_change_in_production';

// Interface pour les requetes authentifiees
export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

/**
 * Middleware pour verifier si l'utilisateur est authentifie (optionnel)
 * Attache userId et userRole a la requete si un token valide est present
 */
export const checkAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return next();
    }

    // Verifier si le token est blackliste
    const blacklistedToken = await prisma.tokenBlacklist.findUnique({
      where: { token },
    });
    if (blacklistedToken) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error) {
    // Token invalide mais on continue (optionnel)
    next();
  }
};

/**
 * Middleware pour exiger l'authentification
 * Retourne une erreur 401 si l'utilisateur n'est pas authentifie
 */
export const authRequired = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Acces non autorise : pas de token fourni' });
    }

    // Verifier si le token est blackliste
    const blacklistedToken = await prisma.tokenBlacklist.findUnique({
      where: { token },
    });
    if (blacklistedToken) {
      return res.status(401).json({ message: 'Token revoque' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expire' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide' });
    }
    return res.status(401).json({ message: 'Acces non autorise' });
  }
};

/**
 * Middleware pour exiger un role specifique
 * @param roles - Liste des roles autorises
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole) {
      return res.status(401).json({ message: 'Acces non autorise' });
    }

    if (!roles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Permission refusee' });
    }

    next();
  };
};

/**
 * Middleware admin uniquement
 */
export const adminOnly = requireRole('ADMIN');
