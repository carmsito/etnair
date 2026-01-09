import { AnnounceInfo } from '@prisma/client';
import BaseService, { prisma } from './base.service';

export default class AnnounceInfoService extends BaseService<AnnounceInfo> {
  constructor() {
    super('announceInfo');
  }

  // Recuperer les infos par ID d'annonce
  async findByAnnounceId(announceId: number): Promise<AnnounceInfo | null> {
    return prisma.announceInfo.findUnique({
      where: { announceId },
    });
  }

  // Creer ou mettre a jour les infos d'une annonce
  async upsertByAnnounceId(announceId: number, data: Partial<AnnounceInfo>): Promise<AnnounceInfo> {
    return prisma.announceInfo.upsert({
      where: { announceId },
      update: data,
      create: {
        ...data,
        announceId,
      },
    });
  }
}
