import { Announce } from '@prisma/client';
import BaseService, { prisma, PaginationOptions, PaginatedResult } from './base.service';

// Type pour annonce avec note moyenne
type AnnounceWithRating = Announce & { averageRating: number | null; reviewCount: number };

export default class AnnouncesService extends BaseService<Announce> {
  constructor() {
    super('announce');
  }

  // Ajouter les statistiques de rating à une liste d'annonces
  private async addRatingStats(announces: Announce[]): Promise<AnnounceWithRating[]> {
    const announceIds = announces.map(a => a.id);
    
    // Récupérer les stats de rating pour toutes les annonces
    const ratingStats = await prisma.review.groupBy({
      by: ['announceId'],
      where: { announceId: { in: announceIds } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    
    // Créer une map pour un accès rapide
    const statsMap = new Map(ratingStats.map(s => [s.announceId, { avg: s._avg.rating, count: s._count.rating }]));
    
    // Ajouter les stats à chaque annonce
    return announces.map(announce => ({
      ...announce,
      averageRating: statsMap.get(announce.id)?.avg ?? null,
      reviewCount: statsMap.get(announce.id)?.count ?? 0,
    }));
  }

  // Recuperer toutes les annonces avec leurs relations
  async findAllWithRelations(options: PaginationOptions = {}): Promise<AnnounceWithRating[] | PaginatedResult<AnnounceWithRating>> {
    const result = await this.findAll({
      ...options,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        info: true,
        pictures: true,
      },
    });

    // Ajouter les stats de rating
    if (Array.isArray(result)) {
      return this.addRatingStats(result);
    } else {
      const dataWithRatings = await this.addRatingStats(result.data);
      return { ...result, data: dataWithRatings };
    }
  }

  // Recuperer une annonce par ID avec toutes ses relations
  async findByIdWithRelations(id: number): Promise<AnnounceWithRating | null> {
    const announce = await prisma.announce.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
          },
        },
        info: true,
        pictures: true,
        reservations: {
          where: {
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          select: {
            arriveAt: true,
            leaveAt: true,
          },
        },
      },
    });

    if (!announce) return null;

    // Ajouter les stats de rating
    const ratingStats = await prisma.review.aggregate({
      where: { announceId: id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      ...announce,
      averageRating: ratingStats._avg.rating ?? null,
      reviewCount: ratingStats._count.rating,
    };
  }

  // Recuperer les annonces d'un utilisateur
  async findByUserId(userId: number): Promise<Announce[]> {
    return prisma.announce.findMany({
      where: { userId },
      include: {
        info: true,
        pictures: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Rechercher des annonces
  async search(filters: {
    city?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    capacity?: number;
  }, options: PaginationOptions = {}): Promise<AnnounceWithRating[] | PaginatedResult<AnnounceWithRating>> {
    const where: any = {
      isActive: true,
    };

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) where.price.gte = filters.minPrice;
      if (filters.maxPrice) where.price.lte = filters.maxPrice;
    }
    if (filters.capacity) {
      where.info = { capacity: { gte: filters.capacity } };
    }

    const result = await this.findAll({
      ...options,
      where,
      include: {
        user: {
          select: { id: true, username: true },
        },
        info: true,
        pictures: {
          where: { isCover: true },
          take: 1,
        },
      },
    });

    // Ajouter les stats de rating
    if (Array.isArray(result)) {
      return this.addRatingStats(result);
    } else {
      const dataWithRatings = await this.addRatingStats(result.data);
      return { ...result, data: dataWithRatings };
    }
  }

  // Creer une annonce avec ses informations
  async createWithInfo(
    announceData: any,
    infoData?: any
  ): Promise<Announce> {
    return prisma.announce.create({
      data: {
        ...announceData,
        info: infoData ? { create: infoData } : undefined,
      },
      include: {
        info: true,
      },
    });
  }
}
