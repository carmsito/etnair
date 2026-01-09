import { PrismaClient } from '@prisma/client';

// Instance Prisma partagee (singleton pattern)
const prisma = new PrismaClient();

export { prisma };

// Interface pour les options de pagination
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: any;
  include?: any;
  where?: any;
}

// Interface pour le resultat pagine
export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default class BaseService<T> {
  protected model: any;
  protected modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.model = (prisma as any)[modelName];
  }

  // Creer un enregistrement
  async create(data: any): Promise<T> {
    return this.model.create({ data });
  }

  // Recuperer tous les enregistrements avec pagination optionnelle
  async findAll(options: PaginationOptions = {}): Promise<T[] | PaginatedResult<T>> {
    const { page, limit, orderBy, include, where } = options;

    // Si pagination demandee
    if (page && limit) {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        this.model.findMany({
          skip,
          take: limit,
          orderBy: orderBy || { id: 'desc' },
          include,
          where,
        }),
        this.model.count({ where }),
      ]);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    // Sans pagination
    return this.model.findMany({
      orderBy: orderBy || { id: 'desc' },
      include,
      where,
    });
  }

  // Recuperer un enregistrement par ID
  async findById(id: number, include?: any): Promise<T | null> {
    return this.model.findUnique({
      where: { id },
      include,
    });
  }

  // Recuperer un enregistrement par un critere
  async findOne(where: any, include?: any): Promise<T | null> {
    return this.model.findFirst({
      where,
      include,
    });
  }

  // Mettre a jour un enregistrement
  async update(id: number, data: any): Promise<T | null> {
    try {
      return await this.model.update({
        where: { id },
        data,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return null; // Enregistrement non trouve
      }
      throw error;
    }
  }

  // Supprimer un enregistrement
  async delete(id: number): Promise<boolean> {
    try {
      await this.model.delete({
        where: { id },
      });
      return true;
    } catch (error: any) {
      if (error.code === 'P2025') {
        return false; // Enregistrement non trouve
      }
      throw error;
    }
  }

  // Compter les enregistrements
  async count(where?: any): Promise<number> {
    return this.model.count({ where });
  }
}
