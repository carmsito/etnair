import { Favorite } from '@prisma/client';
import { prisma } from './base.service';

export default class FavoritesService {
  // Ajouter une annonce aux favoris
  async add(userId: number, announceId: number): Promise<Favorite> {
    return prisma.favorite.create({
      data: {
        userId,
        announceId,
      },
      include: {
        announce: {
          include: {
            pictures: true,
            info: true,
          },
        },
      },
    });
  }

  // Retirer une annonce des favoris
  async remove(userId: number, announceId: number): Promise<boolean> {
    const result = await prisma.favorite.deleteMany({
      where: {
        userId,
        announceId,
      },
    });
    return result.count > 0;
  }

  // Vérifier si une annonce est dans les favoris
  async isFavorite(userId: number, announceId: number): Promise<boolean> {
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_announceId: {
          userId,
          announceId,
        },
      },
    });
    return !!favorite;
  }

  // Récupérer tous les favoris d'un utilisateur
  async getByUserId(userId: number): Promise<Favorite[]> {
    return prisma.favorite.findMany({
      where: { userId },
      include: {
        announce: {
          include: {
            pictures: true,
            info: true,
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Compter les favoris d'un utilisateur
  async countByUserId(userId: number): Promise<number> {
    return prisma.favorite.count({
      where: { userId },
    });
  }

  // Compter combien de fois une annonce a été ajoutée aux favoris
  async countByAnnounceId(announceId: number): Promise<number> {
    return prisma.favorite.count({
      where: { announceId },
    });
  }

  // Basculer le statut favori (ajouter/retirer)
  async toggle(userId: number, announceId: number): Promise<{ isFavorite: boolean }> {
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_announceId: {
          userId,
          announceId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { isFavorite: false };
    } else {
      await prisma.favorite.create({
        data: {
          userId,
          announceId,
        },
      });
      return { isFavorite: true };
    }
  }
}
