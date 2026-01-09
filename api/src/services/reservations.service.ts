import { Reservation } from '@prisma/client';
import BaseService, { prisma, PaginationOptions, PaginatedResult } from './base.service';

export default class ReservationsService extends BaseService<Reservation> {
  constructor() {
    super('reservation');
  }

  // Recuperer toutes les reservations avec relations
  async findAllWithRelations(options: PaginationOptions = {}): Promise<Reservation[] | PaginatedResult<Reservation>> {
    return this.findAll({
      ...options,
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
        announce: {
          select: { id: true, title: true, price: true, city: true },
        },
      },
    });
  }

  // Recuperer une reservation par ID avec relations
  async findByIdWithRelations(id: number): Promise<Reservation | null> {
    return prisma.reservation.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, username: true, email: true, phone: true },
        },
        announce: {
          include: {
            user: {
              select: { id: true, username: true, email: true, phone: true },
            },
            info: true,
            pictures: true,
          },
        },
      },
    });
  }

  // Recuperer les reservations d'un utilisateur
  async findByUserId(userId: number): Promise<Reservation[]> {
    return prisma.reservation.findMany({
      where: { userId },
      include: {
        announce: {
          include: {
            pictures: {
              where: { isCover: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { reservedAt: 'desc' },
    });
  }

  // Recuperer les reservations pour une annonce
  async findByAnnounceId(announceId: number): Promise<Reservation[]> {
    return prisma.reservation.findMany({
      where: { announceId },
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { arriveAt: 'asc' },
    });
  }

  // Verifier la disponibilite d'une annonce pour une periode
  async checkAvailability(
    announceId: number,
    arriveAt: Date,
    leaveAt: Date,
    excludeReservationId?: number
  ): Promise<boolean> {
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        announceId,
        id: excludeReservationId ? { not: excludeReservationId } : undefined,
        status: { in: ['PENDING', 'CONFIRMED'] },
        OR: [
          {
            AND: [
              { arriveAt: { lte: arriveAt } },
              { leaveAt: { gt: arriveAt } },
            ],
          },
          {
            AND: [
              { arriveAt: { lt: leaveAt } },
              { leaveAt: { gte: leaveAt } },
            ],
          },
          {
            AND: [
              { arriveAt: { gte: arriveAt } },
              { leaveAt: { lte: leaveAt } },
            ],
          },
        ],
      },
    });

    return !existingReservation;
  }

  // Calculer le prix total d'une reservation
  calculateTotalPrice(pricePerNight: number, arriveAt: Date, leaveAt: Date): number {
    const nights = Math.ceil(
      (leaveAt.getTime() - arriveAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    return pricePerNight * nights;
  }

  // Creer une reservation avec verification de disponibilite
  async createWithAvailabilityCheck(data: {
    userId: number;
    announceId: number;
    arriveAt: Date;
    leaveAt: Date;
    guestCount?: number;
    title?: string;
  }): Promise<Reservation | null> {
    // Verifier la disponibilite
    const isAvailable = await this.checkAvailability(
      data.announceId,
      data.arriveAt,
      data.leaveAt
    );

    if (!isAvailable) {
      return null;
    }

    // Recuperer l'annonce pour le prix et les infos
    const announce = await prisma.announce.findUnique({
      where: { id: data.announceId },
      include: { info: true, user: true },
    });

    if (!announce || !announce.isActive) {
      return null;
    }

    // Calculer le prix total
    const totalPrice = this.calculateTotalPrice(
      announce.price,
      data.arriveAt,
      data.leaveAt
    );

    // Creer la reservation
    return this.create({
      ...data,
      totalPrice,
      city: announce.city,
      address: announce.info?.address,
      contactHost: announce.user?.email,
    });
  }

  // Mettre a jour le statut d'une reservation
  async updateStatus(id: number, status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'): Promise<Reservation | null> {
    return this.update(id, { status });
  }

  // Recuperer les reservations recues par un proprietaire (sur ses annonces)
  async findReceivedByOwnerId(ownerId: number): Promise<Reservation[]> {
    return prisma.reservation.findMany({
      where: {
        announce: {
          userId: ownerId,
        },
      },
      include: {
        user: {
          select: { id: true, username: true, email: true, phone: true },
        },
        announce: {
          include: {
            pictures: {
              where: { isCover: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { reservedAt: 'desc' },
    });
  }
}
