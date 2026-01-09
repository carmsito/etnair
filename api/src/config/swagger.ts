import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ETNAir API',
      version: '1.0.0',
      description: 'API REST pour la plateforme de location ETNAir (type Airbnb)',
      contact: {
        name: 'ETNA',
        email: 'contact@etna.io',
      },
    },
    servers: [
      {
        url: 'http://localhost:8080',
        description: 'Serveur de developpement',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Announce: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            type: {
              type: 'string',
              enum: ['APARTMENT', 'HOUSE', 'VILLA', 'STUDIO', 'ROOM', 'OTHER'],
            },
            price: { type: 'number' },
            city: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        AnnounceInfo: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            announceId: { type: 'integer' },
            content: { type: 'string' },
            address: { type: 'string' },
            postalCode: { type: 'string' },
            country: { type: 'string' },
            capacity: { type: 'integer' },
            bedrooms: { type: 'integer' },
            bathrooms: { type: 'integer' },
            amenities: { type: 'string' },
            rules: { type: 'string' },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            userId: { type: 'integer' },
            announceId: { type: 'integer' },
            title: { type: 'string' },
            totalPrice: { type: 'number' },
            arriveAt: { type: 'string', format: 'date-time' },
            leaveAt: { type: 'string', format: 'date-time' },
            reservedAt: { type: 'string', format: 'date-time' },
            status: {
              type: 'string',
              enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'],
            },
            city: { type: 'string' },
            address: { type: 'string' },
            contactHost: { type: 'string' },
            guestCount: { type: 'integer' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: { type: 'object' },
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: { type: 'array', items: { type: 'object' } },
            meta: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentification et gestion des sessions' },
      { name: 'Users', description: 'Gestion des utilisateurs' },
      { name: 'Announces', description: 'Gestion des annonces de logements' },
      { name: 'Reservations', description: 'Gestion des reservations' },
      { name: 'Pictures', description: 'Gestion des images des annonces' },
    ],
  },
  apis: ['./controllers/*.ts', './controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
