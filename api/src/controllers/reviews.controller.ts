import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import reviewsService from '../services/reviews.service';
import { authRequired } from '../middleware/auth';

/**
 * @swagger
 * components:
 *   schemas:
 *     Review:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         userId:
 *           type: integer
 *         announceId:
 *           type: integer
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         comment:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             username:
 *               type: string
 *         announce:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *             title:
 *               type: string
 */

export default function reviewsController(router: Router): void {
  /**
   * @swagger
   * /api/reviews/announce/{announceId}:
   *   get:
   *     summary: Liste les avis d'une annonce
   *     tags: [Reviews]
   *     parameters:
   *       - in: path
   *         name: announceId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Liste des avis
   */
  router.get(
    '/announce/:announceId',
    param('announceId').isInt().toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ message: 'Validation error', errors: errors.array() });
          return;
        }

        const { announceId } = req.params;
        const { page, limit } = req.query;

        const reviews = await reviewsService.findByAnnounce(
          parseInt(announceId),
          { page: page ? parseInt(page as string) : undefined, limit: limit ? parseInt(limit as string) : undefined }
        );

        res.json(reviews);
      } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
      }
    }
  );

  /**
   * @swagger
   * /api/reviews/announce/{announceId}/rating:
   *   get:
   *     summary: Note moyenne d'une annonce
   *     tags: [Reviews]
   *     parameters:
   *       - in: path
   *         name: announceId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Note moyenne et nombre d'avis
   */
  router.get(
    '/announce/:announceId/rating',
    param('announceId').isInt().toInt(),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { announceId } = req.params;
        const result = await reviewsService.getAverageRating(parseInt(announceId));
        res.json(result);
      } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
      }
    }
  );

  /**
   * @swagger
   * /api/reviews/user/{userId}:
   *   get:
   *     summary: Liste les avis d'un utilisateur
   *     tags: [Reviews]
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: integer
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Liste des avis de l'utilisateur
   */
  router.get(
    '/user/:userId',
    param('userId').isInt().toInt(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ message: 'Validation error', errors: errors.array() });
          return;
        }

        const { userId } = req.params;
        const { page, limit } = req.query;

        const reviews = await reviewsService.findByUser(
          parseInt(userId),
          { page: page ? parseInt(page as string) : undefined, limit: limit ? parseInt(limit as string) : undefined }
        );

        res.json(reviews);
      } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
      }
    }
  );

  /**
   * @swagger
   * /api/reviews/{id}:
   *   get:
   *     summary: Détails d'un avis
   *     tags: [Reviews]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Détails de l'avis
   *       404:
   *         description: Avis non trouvé
   */
  router.get(
    '/:id',
    param('id').isInt().toInt(),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const review = await reviewsService.findReviewById(parseInt(id));

        if (!review) {
          res.status(404).json({ message: 'Avis non trouvé' });
          return;
        }

        res.json(review);
      } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
      }
    }
  );

  /**
   * @swagger
   * /api/reviews:
   *   post:
   *     summary: Créer un avis (nécessite une réservation complétée)
   *     tags: [Reviews]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - announceId
   *               - rating
   *             properties:
   *               announceId:
   *                 type: integer
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *               comment:
   *                 type: string
   *     responses:
   *       201:
   *         description: Avis créé
   *       403:
   *         description: Pas de réservation complétée ou avis déjà existant
   */
  router.post(
    '/',
    authRequired,
    body('announceId').isInt().withMessage('announceId doit être un entier'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
    body('comment').optional().isString().isLength({ max: 2000 }).withMessage('Le commentaire est trop long'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ message: 'Validation error', errors: errors.array() });
          return;
        }

        const userId = (req as any).userId;
        const { announceId, rating, comment } = req.body;

        const review = await reviewsService.createReview(userId, announceId, rating, comment);
        res.status(201).json(review);
      } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
      }
    }
  );

  /**
   * @swagger
   * /api/reviews/{id}:
   *   put:
   *     summary: Modifier un avis
   *     tags: [Reviews]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               rating:
   *                 type: integer
   *                 minimum: 1
   *                 maximum: 5
   *               comment:
   *                 type: string
   *     responses:
   *       200:
   *         description: Avis modifié
   *       403:
   *         description: Non autorisé
   *       404:
   *         description: Avis non trouvé
   */
  router.put(
    '/:id',
    authRequired,
    param('id').isInt().toInt(),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('La note doit être entre 1 et 5'),
    body('comment').optional().isString().isLength({ max: 2000 }).withMessage('Le commentaire est trop long'),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ message: 'Validation error', errors: errors.array() });
          return;
        }

        const { id } = req.params;
        const userId = (req as any).userId;
        const isAdmin = (req as any).userRole === 'ADMIN';
        const { rating, comment } = req.body;

        const review = await reviewsService.updateReview(parseInt(id), userId, isAdmin, { rating, comment });
        res.json(review);
      } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
      }
    }
  );

  /**
   * @swagger
   * /api/reviews/{id}:
   *   delete:
   *     summary: Supprimer un avis
   *     tags: [Reviews]
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
   *         description: Avis supprimé
   *       403:
   *         description: Non autorisé
   *       404:
   *         description: Avis non trouvé
   */
  router.delete(
    '/:id',
    authRequired,
    param('id').isInt().toInt(),
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { id } = req.params;
        const userId = (req as any).userId;
        const isAdmin = (req as any).userRole === 'ADMIN';

        await reviewsService.deleteReview(parseInt(id), userId, isAdmin);
        res.status(204).send();
      } catch (error: any) {
        res.status(error.status || 500).json({ message: error.message || 'Erreur serveur' });
      }
    }
  );
}
