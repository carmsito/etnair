import { Router, Request, Response } from 'express';
import BaseController, { AuthRequest } from './base.controller';
import ReservationsService from '../services/reservations.service';
import { body, param } from 'express-validator';
import { authRequired } from '../middleware/auth';

const reservationsService = new ReservationsService();

// Validations
const reservationValidation = {
  create: [
    body('announceId').isInt().withMessage('ID d\'annonce invalide'),
    body('arriveAt').isISO8601().withMessage('Date d\'arrivee invalide'),
    body('leaveAt').isISO8601().withMessage('Date de depart invalide'),
    body('guestCount').optional().isInt({ min: 1 }).withMessage('Nombre de personnes invalide'),
    body('title').optional().isString(),
  ],
  update: [
    param('id').isInt().withMessage('ID invalide'),
    body('status').optional().isIn(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).withMessage('Statut invalide'),
  ],
};

export default (router: Router) => {
  const controller = new BaseController(reservationsService, 'Reservation');

  /**
   * @swagger
   * /api/reservations:
   *   get:
   *     summary: Recuperer toutes les reservations (admin)
   *     tags: [Reservations]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des reservations
   */
  router.get('/', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || undefined;
      const limit = parseInt(req.query.limit as string) || undefined;

      // Si admin, voir toutes les reservations
      if (req.userRole === 'ADMIN') {
        const reservations = await reservationsService.findAllWithRelations({ page, limit });
        return res.json(reservations);
      }

      // Sinon, voir seulement ses reservations
      const reservations = await reservationsService.findByUserId(req.userId!);
      res.json(reservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/reservations/received:
   *   get:
   *     summary: Recuperer les reservations recues (en tant que proprietaire)
   *     tags: [Reservations]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste des reservations recues sur mes annonces
   */
  router.get('/received', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const reservations = await reservationsService.findReceivedByOwnerId(req.userId!);
      res.json(reservations);
    } catch (error) {
      console.error('Error fetching received reservations:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/reservations/{id}:
   *   get:
   *     summary: Recuperer une reservation par ID
   *     tags: [Reservations]
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
   *         description: Reservation trouvee
   *       404:
   *         description: Reservation non trouvee
   */
  router.get('/:id', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      const reservation = await reservationsService.findByIdWithRelations(id);
      if (!reservation) {
        return res.status(404).json({ message: 'Reservation non trouvee' });
      }

      // Verifier les droits d'acces
      if (reservation.userId !== req.userId && req.userRole !== 'ADMIN') {
        // Verifier si l'utilisateur est le proprietaire de l'annonce
        const announceOwnerId = (reservation as any).announce?.user?.id;
        if (announceOwnerId !== req.userId) {
          return res.status(403).json({ message: 'Acces non autorise' });
        }
      }

      res.json(reservation);
    } catch (error) {
      console.error('Error fetching reservation:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/reservations:
   *   post:
   *     summary: Creer une reservation
   *     tags: [Reservations]
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
   *               - arriveAt
   *               - leaveAt
   *             properties:
   *               announceId:
   *                 type: integer
   *               arriveAt:
   *                 type: string
   *                 format: date-time
   *               leaveAt:
   *                 type: string
   *                 format: date-time
   *               guestCount:
   *                 type: integer
   *               title:
   *                 type: string
   *     responses:
   *       201:
   *         description: Reservation creee
   *       400:
   *         description: Dates non disponibles
   */
  router.post('/', authRequired, reservationValidation.create, async (req: AuthRequest, res: Response) => {
    try {
      if (controller['handleValidationErrors'](req, res)) return;

      const { announceId, arriveAt, leaveAt, guestCount, title } = req.body;

      // Verifier que la date de depart est apres la date d'arrivee
      const arriveDate = new Date(arriveAt);
      const leaveDate = new Date(leaveAt);
      if (leaveDate <= arriveDate) {
        return res.status(400).json({ message: 'La date de depart doit etre apres la date d\'arrivee' });
      }

      const reservation = await reservationsService.createWithAvailabilityCheck({
        userId: req.userId!,
        announceId,
        arriveAt: arriveDate,
        leaveAt: leaveDate,
        guestCount,
        title,
      });

      if (!reservation) {
        return res.status(400).json({ message: 'Les dates selectionnees ne sont pas disponibles ou l\'annonce n\'existe pas' });
      }

      res.status(201).json(reservation);
    } catch (error) {
      console.error('Error creating reservation:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/reservations/{id}:
   *   put:
   *     summary: Mettre a jour une reservation (statut)
   *     tags: [Reservations]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: [PENDING, CONFIRMED, CANCELLED, COMPLETED]
   *     responses:
   *       200:
   *         description: Reservation mise a jour
   */
  router.put('/:id', authRequired, reservationValidation.update, async (req: AuthRequest, res: Response) => {
    try {
      if (controller['handleValidationErrors'](req, res)) return;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      const existingReservation = await reservationsService.findByIdWithRelations(id);
      if (!existingReservation) {
        return res.status(404).json({ message: 'Reservation non trouvee' });
      }

      // Verifier les droits
      const isOwner = existingReservation.userId === req.userId;
      const isAnnounceOwner = (existingReservation as any).announce?.user?.id === req.userId;
      const isAdmin = req.userRole === 'ADMIN';

      if (!isOwner && !isAnnounceOwner && !isAdmin) {
        return res.status(403).json({ message: 'Acces non autorise' });
      }

      // L'utilisateur peut annuler ou terminer sa propre reservation
      if (isOwner && !isAnnounceOwner && !isAdmin && !['CANCELLED', 'COMPLETED'].includes(req.body.status)) {
        return res.status(403).json({ message: 'Vous ne pouvez qu\'annuler ou terminer votre reservation' });
      }

      const reservation = await reservationsService.update(id, req.body);
      res.json(reservation);
    } catch (error) {
      console.error('Error updating reservation:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/reservations/{id}:
   *   delete:
   *     summary: Supprimer une reservation
   *     tags: [Reservations]
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
   *         description: Reservation supprimee
   */
  router.delete('/:id', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      const reservation = await reservationsService.findById(id);
      if (!reservation) {
        return res.status(404).json({ message: 'Reservation non trouvee' });
      }

      // Seul le proprietaire ou un admin peut supprimer
      if ((reservation as any).userId !== req.userId && req.userRole !== 'ADMIN') {
        return res.status(403).json({ message: 'Acces non autorise' });
      }

      await reservationsService.delete(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting reservation:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/reservations/check-availability:
   *   post:
   *     summary: Verifier la disponibilite d'une annonce
   *     tags: [Reservations]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - announceId
   *               - arriveAt
   *               - leaveAt
   *             properties:
   *               announceId:
   *                 type: integer
   *               arriveAt:
   *                 type: string
   *                 format: date-time
   *               leaveAt:
   *                 type: string
   *                 format: date-time
   *     responses:
   *       200:
   *         description: Resultat de la disponibilite
   */
  router.post('/check-availability', async (req: Request, res: Response) => {
    try {
      const { announceId, arriveAt, leaveAt } = req.body;

      if (!announceId || !arriveAt || !leaveAt) {
        return res.status(400).json({ message: 'Donnees manquantes' });
      }

      const isAvailable = await reservationsService.checkAvailability(
        parseInt(announceId),
        new Date(arriveAt),
        new Date(leaveAt)
      );

      res.json({ available: isAvailable });
    } catch (error) {
      console.error('Error checking availability:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/reservations/announce/{announceId}:
   *   get:
   *     summary: Recuperer les reservations d'une annonce
   *     tags: [Reservations]
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
   *         description: Liste des reservations
   */
  router.get('/announce/:announceId', authRequired, async (req: AuthRequest, res: Response) => {
    try {
      const announceId = parseInt(req.params.announceId);
      if (isNaN(announceId)) {
        return res.status(400).json({ message: 'ID d\'annonce invalide' });
      }

      const reservations = await reservationsService.findByAnnounceId(announceId);
      res.json(reservations);
    } catch (error) {
      console.error('Error fetching announce reservations:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });
};
