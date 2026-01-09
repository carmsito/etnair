import { Router, Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// Type pour les requetes authentifiees
export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

export default class BaseController<T> {
  protected service: any;
  protected resourceName: string;

  constructor(service: any, resourceName: string = 'resource') {
    this.service = service;
    this.resourceName = resourceName;
  }

  // Enregistrer les routes CRUD de base
  registerRoutes(router: Router, middleware: any[] = []) {
    router.get('/', ...middleware, this.getAll.bind(this));
    router.get('/:id', ...middleware, this.getById.bind(this));
    router.post('/', ...middleware, this.create.bind(this));
    router.put('/:id', ...middleware, this.update.bind(this));
    router.delete('/:id', ...middleware, this.delete.bind(this));
  }

  // Validation des erreurs express-validator
  protected handleValidationErrors(req: Request, res: Response): boolean {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array(),
      });
      return true;
    }
    return false;
  }

  // GET / - Recuperer tous les elements (avec pagination optionnelle)
  async getAll(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || undefined;
      const limit = parseInt(req.query.limit as string) || undefined;
      const items = await this.service.findAll({ page, limit });
      res.json(items);
    } catch (error: any) {
      console.error(`Error fetching ${this.resourceName}s:`, error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }

  // GET /:id - Recuperer un element par ID
  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      const item = await this.service.findById(id);
      if (!item) {
        return res.status(404).json({ message: `${this.resourceName} non trouve` });
      }
      res.json(item);
    } catch (error: any) {
      console.error(`Error fetching ${this.resourceName}:`, error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }

  // POST / - Creer un element
  async create(req: Request, res: Response) {
    try {
      if (this.handleValidationErrors(req, res)) return;

      const item = await this.service.create(req.body);
      res.status(201).json(item);
    } catch (error: any) {
      console.error(`Error creating ${this.resourceName}:`, error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Un enregistrement avec ces donnees existe deja' });
      }
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }

  // PUT /:id - Mettre a jour un element
  async update(req: Request, res: Response) {
    try {
      if (this.handleValidationErrors(req, res)) return;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      const item = await this.service.update(id, req.body);
      if (!item) {
        return res.status(404).json({ message: `${this.resourceName} non trouve` });
      }
      res.json(item);
    } catch (error: any) {
      console.error(`Error updating ${this.resourceName}:`, error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Un enregistrement avec ces donnees existe deja' });
      }
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }

  // DELETE /:id - Supprimer un element
  async delete(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      const deleted = await this.service.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: `${this.resourceName} non trouve` });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting ${this.resourceName}:`, error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  }
}
