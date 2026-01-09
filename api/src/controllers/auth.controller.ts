import { Router, Request, Response } from 'express';
import UsersService from '../services/users.service';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../services/base.service';

const usersService = new UsersService();
const JWT_SECRET = process.env.JWT_SECRET || 'etnair_secret_key_change_in_production';
const JWT_EXPIRES_IN = 3600; // 1 heure en secondes
const JWT_REFRESH_EXPIRES_IN = 604800; // 7 jours en secondes

// Validations
const authValidation = {
  register: [
    body('username').notEmpty().withMessage('Le nom d\'utilisateur est requis'),
    body('email').isEmail().withMessage('Email invalide'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Le mot de passe doit contenir au moins 6 caracteres'),
    body('phone').optional().isMobilePhone('any').withMessage('Numero de telephone invalide'),
  ],
  login: [
    body('email').isEmail().withMessage('Email invalide'),
    body('password').notEmpty().withMessage('Mot de passe requis'),
  ],
};

// Fonction pour generer les tokens
function generateTokens(userId: number, role: string) {
  const accessOptions: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  const refreshOptions: SignOptions = { expiresIn: JWT_REFRESH_EXPIRES_IN };

  const accessToken = jwt.sign(
    { userId, role },
    JWT_SECRET,
    accessOptions
  );

  const refreshToken = jwt.sign(
    { userId, role, type: 'refresh' },
    JWT_SECRET,
    refreshOptions
  );

  return { accessToken, refreshToken };
}

export default (router: Router) => {
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Enregistrer un nouvel utilisateur
   *     tags: [Auth]
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
   *                 example: johndoe
   *               email:
   *                 type: string
   *                 example: john@example.com
   *               password:
   *                 type: string
   *                 example: password123
   *               phone:
   *                 type: string
   *                 example: +33612345678
   *     responses:
   *       201:
   *         description: Utilisateur cree avec succes
   *       400:
   *         description: Donnees invalides
   *       409:
   *         description: Email deja utilise
   */
  router.post('/register', authValidation.register, async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Erreurs de validation',
          errors: errors.array(),
        });
      }

      const { username, email, password, phone } = req.body;

      // Verifier si l'email existe deja
      const existingUser = await usersService.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'Un utilisateur avec cet email existe deja' });
      }

      // Creer l'utilisateur
      const user = await usersService.createWithHashedPassword({
        username,
        email,
        password,
        phone,
      });

      // Generer les tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.role);

      // Retourner l'utilisateur sans le mot de passe
      const { password: pwd, ...userWithoutPassword } = user;

      res.status(201).json({
        message: 'Utilisateur cree avec succes',
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Error in register:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Connecter un utilisateur
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 example: john@example.com
   *               password:
   *                 type: string
   *                 example: password123
   *     responses:
   *       200:
   *         description: Connexion reussie
   *       401:
   *         description: Email ou mot de passe incorrect
   */
  router.post('/login', authValidation.login, async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          message: 'Erreurs de validation',
          errors: errors.array(),
        });
      }

      const { email, password } = req.body;

      // Trouver l'utilisateur
      const user = await usersService.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      // Verifier le mot de passe
      const isPasswordValid = await usersService.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
      }

      // Generer les tokens
      const { accessToken, refreshToken } = generateTokens(user.id, user.role);

      // Retourner l'utilisateur sans le mot de passe
      const { password: pwd, ...userWithoutPassword } = user;

      res.json({
        message: 'Connexion reussie',
        user: userWithoutPassword,
        accessToken,
        refreshToken,
      });
    } catch (error) {
      console.error('Error in login:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Rafraichir le token d'acces
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Nouveau token genere
   *       401:
   *         description: Token invalide ou expire
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token requis' });
      }

      // Verifier si le token est blackliste
      const blacklistedToken = await prisma.tokenBlacklist.findUnique({
        where: { token: refreshToken },
      });
      if (blacklistedToken) {
        return res.status(401).json({ message: 'Token revoque' });
      }

      // Verifier le refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;

      if (decoded.type !== 'refresh') {
        return res.status(401).json({ message: 'Token invalide' });
      }

      // Generer de nouveaux tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId, decoded.role);

      res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (error: any) {
      console.error('Error in refresh:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Refresh token expire, veuillez vous reconnecter' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token invalide' });
      }
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Deconnecter un utilisateur (blacklister le token)
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               refreshToken:
   *                 type: string
   *     responses:
   *       200:
   *         description: Deconnexion reussie
   */
  router.post('/logout', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.split(' ')[1];

      // Blacklister les tokens
      const tokensToBlacklist = [];

      if (accessToken) {
        try {
          const decoded = jwt.verify(accessToken, JWT_SECRET) as any;
          tokensToBlacklist.push({
            token: accessToken,
            expiresAt: new Date(decoded.exp * 1000),
          });
        } catch (e) {
          // Token deja expire, pas besoin de blacklister
        }
      }

      if (refreshToken) {
        try {
          const decoded = jwt.verify(refreshToken, JWT_SECRET) as any;
          tokensToBlacklist.push({
            token: refreshToken,
            expiresAt: new Date(decoded.exp * 1000),
          });
        } catch (e) {
          // Token deja expire, pas besoin de blacklister
        }
      }

      if (tokensToBlacklist.length > 0) {
        await prisma.tokenBlacklist.createMany({
          data: tokensToBlacklist,
          skipDuplicates: true,
        });
      }

      res.json({ message: 'Deconnexion reussie' });
    } catch (error) {
      console.error('Error in logout:', error);
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Recuperer le profil de l'utilisateur connecte
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profil utilisateur
   *       401:
   *         description: Non autorise
   */
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: 'Token requis' });
      }

      // Verifier si le token est blackliste
      const blacklistedToken = await prisma.tokenBlacklist.findUnique({
        where: { token },
      });
      if (blacklistedToken) {
        return res.status(401).json({ message: 'Token revoque' });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await usersService.findByIdWithAnnounces(decoded.userId);

      if (!user) {
        return res.status(404).json({ message: 'Utilisateur non trouve' });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error('Error in me:', error);
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expire' });
      }
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Token invalide' });
      }
      res.status(500).json({ message: 'Erreur interne du serveur' });
    }
  });
};
