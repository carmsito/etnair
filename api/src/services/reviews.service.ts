import BaseService, { prisma, PaginationOptions } from './base.service';
import { Review } from '@prisma/client';

class ReviewsService extends BaseService<Review> {
  constructor() {
    super('review');
  }

  // Créer un avis (vérifie que l'utilisateur a bien réservé l'annonce)
  async createReview(userId: number, announceId: number, rating: number, comment?: string): Promise<Review> {
    // Vérifier que l'utilisateur a une réservation COMPLETED sur cette annonce
    const completedReservation = await prisma.reservation.findFirst({
      where: {
        userId,
        announceId,
        status: 'COMPLETED',
      },
    });

    if (!completedReservation) {
      throw { status: 403, message: 'Vous devez avoir complété une réservation sur cette annonce pour laisser un avis' };
    }

    // Vérifier si l'utilisateur a déjà laissé un avis
    const existingReview = await prisma.review.findUnique({
      where: {
        userId_announceId: {
          userId,
          announceId,
        },
      },
    });

    if (existingReview) {
      throw { status: 409, message: 'Vous avez déjà laissé un avis sur cette annonce' };
    }

    // Valider la note
    if (rating < 1 || rating > 5) {
      throw { status: 400, message: 'La note doit être entre 1 et 5' };
    }

    return prisma.review.create({
      data: {
        userId,
        announceId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        announce: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // Récupérer les avis d'une annonce avec pagination
  async findByAnnounce(announceId: number, options: PaginationOptions = {}) {
    const { page, limit } = options;

    const where = { announceId };
    const include = {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
    };
    const orderBy = { createdAt: 'desc' as const };

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.review.count({ where }),
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

    return prisma.review.findMany({
      where,
      include,
      orderBy,
    });
  }

  // Récupérer les avis d'un utilisateur
  async findByUser(userId: number, options: PaginationOptions = {}) {
    const { page, limit } = options;

    const where = { userId };
    const include = {
      announce: {
        select: {
          id: true,
          title: true,
          city: true,
        },
      },
    };
    const orderBy = { createdAt: 'desc' as const };

    if (page && limit) {
      const skip = (page - 1) * limit;
      const [data, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include,
          orderBy,
          skip,
          take: limit,
        }),
        prisma.review.count({ where }),
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

    return prisma.review.findMany({
      where,
      include,
      orderBy,
    });
  }

  // Récupérer un avis par ID
  async findReviewById(id: number): Promise<Review | null> {
    return prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        announce: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // Modifier un avis (seulement le propriétaire)
  async updateReview(id: number, userId: number, isAdmin: boolean, data: { rating?: number; comment?: string }): Promise<Review> {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw { status: 404, message: 'Avis non trouvé' };
    }

    // Vérifier les droits
    if (review.userId !== userId && !isAdmin) {
      throw { status: 403, message: 'Non autorisé à modifier cet avis' };
    }

    // Valider la note si fournie
    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw { status: 400, message: 'La note doit être entre 1 et 5' };
    }

    return prisma.review.update({
      where: { id },
      data: {
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        announce: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  // Supprimer un avis (propriétaire ou admin)
  async deleteReview(id: number, userId: number, isAdmin: boolean): Promise<void> {
    const review = await prisma.review.findUnique({
      where: { id },
    });

    if (!review) {
      throw { status: 404, message: 'Avis non trouvé' };
    }

    // Vérifier les droits
    if (review.userId !== userId && !isAdmin) {
      throw { status: 403, message: 'Non autorisé à supprimer cet avis' };
    }

    await prisma.review.delete({
      where: { id },
    });
  }

  // Calculer la note moyenne d'une annonce
  async getAverageRating(announceId: number): Promise<{ average: number; count: number }> {
    const result = await prisma.review.aggregate({
      where: { announceId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      average: result._avg.rating || 0,
      count: result._count.rating,
    };
  }
}

export default new ReviewsService();
