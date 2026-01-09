// Configuration de l'application
export const config = {
  // Serveur
  port: parseInt(process.env.PORT || '8080'),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Base de donnees
  databaseUrl: process.env.DATABASE_URL || 'postgresql://etnair_user:etnair_pass@localhost:5432/etnair_db',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'etnair_secret_key_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // MinIO / S3
  s3: {
    endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
    accessKey: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.S3_SECRET_KEY || 'minioadmin',
    bucket: process.env.S3_BUCKET || 'etnair-images',
    region: process.env.S3_REGION || 'us-east-1',
  },

  // CORS - Autoriser localhost, Docker et production
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://front:3000',
    'http://etnair_front:3000',
    'https://etnair-front.onrender.com',
  ],

  // Pagination par defaut
  defaultPageSize: 10,
  maxPageSize: 100,
};

export default config;
