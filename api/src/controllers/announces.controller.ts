import { Router, Request, Response } from 'express';
import BaseController, { AuthRequest } from './base.controller';
import AnnouncesService from '../services/announces.service';
import { body, param, query } from 'express-validator';
import { authRequired } from '../middleware/auth';

const announcesService = new AnnouncesService();

// Validations
const announceValidation = {
  create: [
    body('title').notEmpty().withMessage('Le titre est requis'),
    body('type').isIn(['APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'ROOM', 'OTHER']).withMessage('Type invalide'),
    body('price').isFloat({ min: 0 }).withMessage('Le prix doit etre un nombre positif'),
    body('city').optional().isString().withMessage('La ville doit etre une chaine'),
    body('description').optional().isString(),
  ],
  update: [
    param('id').isInt().withMessage('ID invalide'),
    body('title').optional().notEmpty().withMessage('Le titre ne peut pas etre vide'),
    body('type').optional().isIn(['APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'ROOM', 'OTHER']).withMessage('Type invalide'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Le prix doit etre un nombre positif'),
  ],
  search: [
    query('city').optional().isString(),
    query('type').optional().isIn(['APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'ROOM', 'OTHER']),
    query('minPrice').optional().isFloat({ min: 0 }),
    query('maxPrice').optional().isFloat({ min: 0 }),
    query('capacity').optional().isInt({ min: 1 }),
  ],
};

export default (router: Router) => {
  const controller = new BaseController(announcesService, 'Annonce');

  /**
   * @swagger
   * /api/announces:
   *   get:
   *     summary: Recuperer toutes les annonces
   *     tags: [Announces]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *       - in: query
   *         name: city
   *         schema:
   *           type: string
   *       - in: query
   *         name: type
   *         schema:
   *           type: string
   *           enum: [APARTMENT, HOUSE, VILLA, STUDIO, ROOM, OTHER]
   *       - in: query
   *         name: minPrice
   *         schema:
   *           type: number
   *       - in: query
   *         name: maxPrice
   *         schema:
   *           type: number
   *     responses:
   *       200:
   *         description: Liste des annonces
   */
  router.get('/', announceValidation.search, async (req: Request, res: Response) => {
    try {
      if (controller['handleValidationErrors'](req, res)) return;

      const page = parseInt(req.query.page as string) || undefined;
      const limit = parseInt(req.query.limit as string) || undefined;
      const { city, type, minPrice, maxPrice, capacity } = req.query;

      // Si des filtres de recherche sont presents
      if (city || type || minPrice || maxPrice || capacity) {
        const announces = await announcesService.search(
          {
            city: city as string,
            type: type as string,
            minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
            maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
            capacity: capacity ? parseInt(capacity as string) : undefined,
          },
          { page, limit }
        );
        return res.json(announces);
      }

      const announces = await announcesService.findAllWithRelations({ page, limit });
      res.json(announces);
    } catch (error) {
      console.error('Error fetching announces:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/announces/{id}:
   *   get:
   *     summary: Recuperer une annonce par ID
   *     tags: [Announces]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Annonce trouvee
   *       404:
   *         description: Annonce non trouvee
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }
      const announce = await announcesService.findByIdWithRelations(id);
      if (!announce) {
        return res.status(404).json({ message: 'Annonce non trouvee' });
      }
      res.json(announce);
    } catch (error) {
      console.error('Error fetching announce:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/announces:
   *   post:
   *     summary: Creer une annonce
   *     tags: [Announces]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - title
   *               - type
   *               - price
   *             properties:
   *               title:
   *                 type: string
   *               description:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [APARTMENT, HOUSE, VILLA, STUDIO, ROOM, OTHER]
   *               price:
   *                 type: number
   *               city:
   *                 type: string
   *               info:
   *                 type: object
   *                 properties:
   *                   content:
   *                     type: string
   *                   address:
   *                     type: string
   *                   capacity:
   *                     type: integer
   *     responses:
   *       201:
   *         description: Annonce creee
   *       401:
   *         description: Non autorise
   */
  router.post('/', authRequired, announceValidation.create, async (req: AuthRequest, res: Response) => {
    try {
      if (controller['handleValidationErrors'](req, res)) return;

      const { info, ...announceData } = req.body;
      announceData.userId = req.userId;

      const announce = await announcesService.createWithInfo(announceData, info);
      res.status(201).json(announce);
    } catch (error: any) {
      console.error('Error creating announce:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/announces/{id}:
   *   put:
   *     summary: Mettre a jour une annonce
   *     tags: [Announces]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Annonce mise a jour
   *       404:
   *         description: Annonce non trouvee
   */
  router.put('/:id', authRequired, announceValidation.update, async (req: AuthRequest, res: Response) => {
    try {
      if (controller['handleValidationErrors'](req, res)) return;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      // Verifier que l'utilisateur est proprietaire de l'annonce
      const existingAnnounce = await announcesService.findById(id);
      if (!existingAnnounce) {
        return res.status(404).json({ message: 'Annonce non trouvee' });
      }
      if ((existingAnnounce as any).userId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Vous n\'etes pas autorise a modifier cette annonce' });
      }

      const { info, ...announceData } = req.body;
      const announce = await announcesService.update(id, announceData);
      res.json(announce);
    } catch (error) {
      console.error('Error updating announce:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/announces/{id}:
   *   delete:
   *     summary: Supprimer une annonce
   *     tags: [Announces]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Annonce supprimee
   */
  router.delete('/:id', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      // Verifier que l'utilisateur est proprietaire de l'annonce
      const existingAnnounce = await announcesService.findById(id);
      if (!existingAnnounce) {
        return res.status(404).json({ message: 'Annonce non trouvee' });
      }
      if ((existingAnnounce as any).userId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Vous n\'etes pas autorise a supprimer cette annonce' });
      }

      await announcesService.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting announce:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/announces/user/{userId}:
   *   get:
   *     summary: Recuperer les annonces d'un utilisateur
   *     tags: [Announces]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Liste des annonces de l'utilisateur
   */
  router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'ID utilisateur invalide' });
      }
      const announces = await announcesService.findByUserId(userId);
      res.json(announces);
    } catch (error) {
      console.error('Error fetching user announces:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });
};
