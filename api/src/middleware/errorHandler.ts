import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de gestion des erreurs
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erreur interne du serveur';

  res.status(statusCode).json({
    message,
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

/**
 * Middleware pour les routes non trouvees
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({
    message: `Route ${req.method} ${req.originalUrl} non trouvee`,
  });
};

/**
 * Classe d'erreur API personnalisee
 */
export class ApiError extends Error {
  statusCode: number;
  errors?: any[];

  constructor(statusCode: number, message: string, errors?: any[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  static badRequest(message: string, errors?: any[]) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message: string = 'Non autorise') {
    return new ApiError(401, message);
  }

  static forbidden(message: string = 'Acces refuse') {
    return new ApiError(403, message);
  }

  static notFound(message: string = 'Ressource non trouvee') {
    return new ApiError(404, message);
  }

  static conflict(message: string = 'Conflit avec les donnees existantes') {
    return new ApiError(409, message);
  }

  static internal(message: string = 'Erreur interne du serveur') {
    return new ApiError(500, message);
  }
}
