import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

import config from './config';
import swaggerSpec from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';
import { checkAuth } from './middleware/auth';

// Import des controllers
import authController from './controllers/auth.controller';
import usersController from './controllers/users.controller';
import announcesController from './controllers/announces.controller';
import reservationsController from './controllers/reservations.controller';
import reviewsController from './controllers/reviews.controller';
import favoritesController from './controllers/favorites.controller';

const app = express();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middlewares de securite
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
}));

// Logging
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting global
app.use(generalLimiter);

// Documentation Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ETNAir API Documentation',
}));

// Route d'accueil
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenue sur l\'API ETNAir!',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      announces: '/api/announces',
      reservations: '/api/reservations',
      reviews: '/api/reviews',
      favorites: '/api/favorites',
    },
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes API
const authRouter = express.Router();
const usersRouter = express.Router();
const announcesRouter = express.Router();
const reservationsRouter = express.Router();
const reviewsRouter = express.Router();
const favoritesRouter = express.Router();

// Appliquer rate limiter strict sur auth
app.use('/api/auth', authLimiter);

// Enregistrer les routes
authController(authRouter);
usersController(usersRouter);
announcesController(announcesRouter);
reservationsController(reservationsRouter);
reviewsController(reviewsRouter);
favoritesController(favoritesRouter);

// Monter les routes
app.use('/api/auth', authRouter);
app.use('/api/users', checkAuth, usersRouter);
app.use('/api/announces', checkAuth, announcesRouter);
app.use('/api/reservations', checkAuth, reservationsRouter);
app.use('/api/reviews', checkAuth, reviewsRouter);
app.use('/api/favorites', checkAuth, favoritesRouter);

// Gestion des erreurs
app.use(notFoundHandler);
app.use(errorHandler);

// Demarrer le serveur
const PORT = config.port;
if (config.nodeEnv !== 'test') {
  app.listen(PORT, () => {
    console.log(`
    ===============================================
    🚀 ETNAir API Server
    ===============================================
    Port:          ${PORT}
    Environment:   ${config.nodeEnv}
    Documentation: http://localhost:${PORT}/api-docs
    Health:        http://localhost:${PORT}/health
    ===============================================
    `);
  });
}

export default app;
