import { AnnouncePicture } from '@prisma/client';
import BaseService, { prisma } from './base.service';

export default class AnnouncePicturesService extends BaseService<AnnouncePicture> {
  constructor() {
    super('announcePicture');
  }

  // Recuperer toutes les images d'une annonce
  async findByAnnounceId(announceId: number): Promise<AnnouncePicture[]> {
    return prisma.announcePicture.findMany({
      where: { announceId },
      orderBy: [{ isCover: 'desc' }, { createdAt: 'asc' }],
    });
  }

  // Definir une image comme couverture
  async setCover(id: number, announceId: number): Promise<AnnouncePicture> {
    // D'abord, retirer le statut de couverture des autres images
    await prisma.announcePicture.updateMany({
      where: { announceId, isCover: true },
      data: { isCover: false },
    });

    // Puis definir la nouvelle image de couverture
    return prisma.announcePicture.update({
      where: { id },
      data: { isCover: true },
    });
  }

  // Ajouter plusieurs images a une annonce
  async addMultiple(announceId: number, images: { url: string; filename?: string; isCover?: boolean }[]): Promise<AnnouncePicture[]> {
    const createdImages = await prisma.announcePicture.createMany({
      data: images.map((img, index) => ({
        announceId,
        url: img.url,
        filename: img.filename,
        isCover: img.isCover || (index === 0 && images.length === 1),
      })),
    });

    return this.findByAnnounceId(announceId);
  }

  // Supprimer toutes les images d'une annonce
  async deleteByAnnounceId(announceId: number): Promise<number> {
    const result = await prisma.announcePicture.deleteMany({
      where: { announceId },
    });
    return result.count;
  }
}
