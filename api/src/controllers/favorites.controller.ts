import { Router, Response } from 'express';
import { AuthRequest } from './base.controller';
import FavoritesService from '../services/favorites.service';
import { authRequired } from '../middleware/auth';
import { param } from 'express-validator';

const favoritesService = new FavoritesService();

export default (router: Router) => {
  /**
   * @swagger
   * /api/favorites:
   *   get:
   *     summary: Recuperer les favoris de l'utilisateur connecte
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des favoris
   *       401:
   *         description: Non authentifie
   */
  router.get('/', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const favorites = await favoritesService.getByUserId(req.userId!);
      res.json(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/favorites/check/{announceId}:
   *   get:
   *     summary: Verifier si une annonce est dans les favoris
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: announceId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Statut du favori
   *       401:
   *         description: Non authentifie
   */
  router.get('/check/:announceId', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const announceId = parseInt(req.params.announceId);
      if (isNaN(announceId)) {
        return res.status(400).json({ message: 'ID annonce invalide' });
      }
      const isFavorite = await favoritesService.isFavorite(req.userId!, announceId);
      res.json({ isFavorite });
    } catch (error) {
      console.error('Error checking favorite:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/favorites/{announceId}:
   *   post:
   *     summary: Ajouter une annonce aux favoris
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: announceId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       201:
   *         description: Favori ajoute
   *       400:
   *         description: Deja dans les favoris
   *       401:
   *         description: Non authentifie
   */
  router.post('/:announceId', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const announceId = parseInt(req.params.announceId);
      if (isNaN(announceId)) {
        return res.status(400).json({ message: 'ID annonce invalide' });
      }

      // Verifier si deja en favori
      const existing = await favoritesService.isFavorite(req.userId!, announceId);
      if (existing) {
        return res.status(400).json({ message: 'Cette annonce est deja dans vos favoris' });
      }

      const favorite = await favoritesService.add(req.userId!, announceId);
      res.status(201).json(favorite);
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      if (error.code === 'P2002') {
        return res.status(400).json({ message: 'Cette annonce est deja dans vos favoris' });
      }
      if (error.code === 'P2003') {
        return res.status(404).json({ message: 'Annonce non trouvee' });
      }
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/favorites/{announceId}:
   *   delete:
   *     summary: Retirer une annonce des favoris
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: announceId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Favori retire
   *       401:
   *         description: Non authentifie
   *       404:
   *         description: Favori non trouve
   */
  router.delete('/:announceId', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const announceId = parseInt(req.params.announceId);
      if (isNaN(announceId)) {
        return res.status(400).json({ message: 'ID annonce invalide' });
      }

      const deleted = await favoritesService.remove(req.userId!, announceId);
      if (!deleted) {
        return res.status(404).json({ message: 'Favori non trouve' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error removing favorite:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/favorites/toggle/{announceId}:
   *   post:
   *     summary: Basculer le statut favori (ajouter/retirer)
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: announceId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Nouveau statut du favori
   *       401:
   *         description: Non authentifie
   */
  router.post('/toggle/:announceId', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const announceId = parseInt(req.params.announceId);
      if (isNaN(announceId)) {
        return res.status(400).json({ message: 'ID annonce invalide' });
      }

      const result = await favoritesService.toggle(req.userId!, announceId);
      res.json(result);
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      if (error.code === 'P2003') {
        return res.status(404).json({ message: 'Annonce non trouvee' });
      }
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/favorites/count:
   *   get:
   *     summary: Compter les favoris de l'utilisateur connecte
   *     tags: [Favorites]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Nombre de favoris
   *       401:
   *         description: Non authentifie
   */
  router.get('/count', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const count = await favoritesService.countByUserId(req.userId!);
      res.json({ count });
    } catch (error) {
      console.error('Error counting favorites:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });
};
