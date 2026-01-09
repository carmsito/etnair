import { Router, Request, Response } from 'express';
import BaseController, { AuthRequest } from './base.controller';
import UsersService from '../services/users.service';
import { body, param } from 'express-validator';
import { authRequired, adminOnly } from '../middleware/auth';

const usersService = new UsersService();

// Validations
const userValidation = {
  create: [
    body('username').notEmpty().withMessage('Le nom d\'utilisateur est requis'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caracteres'),
    body('phone').optional().isMobilePhone('any').withMessage('Numero de telephone invalide'),
  ],
  update: [
    param('id').isInt().withMessage('ID invalide'),
    body('username').optional().notEmpty().withMessage('Le nom d\'utilisateur ne peut pas etre vide'),
    body('email').optional().isEmail().withMessage('Email invalide'),
    body('phone').optional().isMobilePhone('any').withMessage('Numero de telephone invalide'),
  ],
};

export default (router: Router) => {
  const controller = new BaseController(usersService, 'Utilisateur');

  /**
   * @swagger
   * /api/users:
   *   get:
   *     summary: Recuperer tous les utilisateurs
   *     tags: [Users]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *         description: Numero de page
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *         description: Nombre d'elements par page
   *     responses:
   *       200:
   *         description: Liste des utilisateurs
   */
  router.get('/', controller.getAll.bind(controller));

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     summary: Recuperer un utilisateur par ID
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Utilisateur trouve
   *       404:
   *         description: Utilisateur non trouve
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }
      const user = await usersService.findByIdWithAnnounces(id);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouve' });
      }
      // Ne pas renvoyer le mot de passe
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/users:
   *   post:
   *     summary: Creer un utilisateur
   *     tags: [Users]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - username
   *               - email
   *               - password
   *             properties:
   *               username:
   *                 type: string
   *               email:
   *                 type: string
   *               password:
   *                 type: string
   *               phone:
   *                 type: string
   *     responses:
   *       201:
   *         description: Utilisateur cree
   *       400:
   *         description: Donnees invalides
   */
  router.post('/', userValidation.create, async (req: Request, res: Response) => {
    try {
      if (controller['handleValidationErrors'](req, res)) return;

      const user = await usersService.createWithHashedPassword(req.body);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Un utilisateur avec cet email existe deja' });
      }
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/users/{id}:
   *   put:
   *     summary: Mettre a jour un utilisateur
   *     tags: [Users]
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
   *               username:
   *                 type: string
   *               email:
   *                 type: string
   *               phone:
   *                 type: string
   *     responses:
   *       200:
   *         description: Utilisateur mis a jour
   *       404:
   *         description: Utilisateur non trouve
   */
  router.put('/:id', userValidation.update, async (req: Request, res: Response) => {
    try {
      if (controller['handleValidationErrors'](req, res)) return;

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      // Ne pas permettre la mise a jour du mot de passe via cette route
      const { password, ...dataToUpdate } = req.body;

      const user = await usersService.update(id, dataToUpdate);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouve' });
      }
      const { password: pwd, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('Error updating user:', error);
      if (error.code === 'P2002') {
        return res.status(409).json({ message: 'Un utilisateur avec cet email existe deja' });
      }
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/users/{id}:
   *   delete:
   *     summary: Supprimer un utilisateur
   *     tags: [Users]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Utilisateur supprime
   *       404:
   *         description: Utilisateur non trouve
   */
  router.delete('/:id', controller.delete.bind(controller));

  // ============================================
  // Routes Admin
  // ============================================

  /**
   * @swagger
   * /api/users/admin/all:
   *   get:
   *     summary: Recuperer tous les utilisateurs avec details (Admin)
   *     tags: [Users, Admin]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Liste complete des utilisateurs
   *       401:
   *         description: Non authentifie
   *       403:
   *         description: Acces refuse (admin requis)
   */
  router.get('/admin/all', authRequired, adminOnly, async (req: Request, res: Response) => {
    try {
      const users = await usersService.findAllWithDetails();
      // Ne pas renvoyer les mots de passe
      const usersWithoutPassword = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPassword);
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/users/{id}/role:
   *   put:
   *     summary: Modifier le role d'un utilisateur (Admin)
   *     tags: [Users, Admin]
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
   *             required:
   *               - role
   *             properties:
   *               role:
   *                 type: string
   *                 enum: [USER, ADMIN]
   *     responses:
   *       200:
   *         description: Role mis a jour
   *       400:
   *         description: Role invalide
   *       403:
   *         description: Permission refusee
   *       404:
   *         description: Utilisateur non trouve
   */
  router.put('/:id/role', authRequired, adminOnly, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      const { role } = req.body;
      if (!role || !['USER', 'ADMIN'].includes(role)) {
        return res.status(400).json({ message: 'Role invalide. Valeurs acceptees: USER, ADMIN' });
      }

      // Empecher un admin de se retirer son propre role admin
      if (id === req.userId && role !== 'ADMIN') {
        return res.status(400).json({ message: 'Vous ne pouvez pas retirer votre propre role admin' });
      }

      const user = await usersService.updateRole(id, role);
      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouve' });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/users/admin/{id}:
   *   delete:
   *     summary: Supprimer un utilisateur (Admin)
   *     tags: [Users, Admin]
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
   *         description: Utilisateur supprime
   *       400:
   *         description: Ne peut pas se supprimer soi-meme
   *       403:
   *         description: Permission refusee
   *       404:
   *         description: Utilisateur non trouve
   */
  router.delete('/admin/:id', authRequired, adminOnly, async (req: AuthRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID invalide' });
      }

      // Empecher un admin de se supprimer lui-meme
      if (id === req.userId) {
        return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte via cette route' });
      }

      const deleted = await usersService.delete(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Utilisateur non trouve' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });
};
