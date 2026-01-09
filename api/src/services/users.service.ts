import { User, UserRole } from '@prisma/client';
import BaseService, { prisma } from './base.service';
import bcrypt from 'bcryptjs';

export default class UsersService extends BaseService<User> {
  constructor() {
    super('user');
  }

  // Creer un utilisateur avec mot de passe hashe
  async createWithHashedPassword(data: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'USER' | 'ADMIN';
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.create({
      ...data,
      password: hashedPassword,
    });
  }

  // Trouver un utilisateur par email
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  // Verifier le mot de passe
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Recuperer un utilisateur avec ses annonces
  async findByIdWithAnnounces(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        announces: true,
        reservations: true,
      },
    });
  }

  // Mettre a jour le mot de passe
  async updatePassword(id: number, newPassword: string): Promise<User | null> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.update(id, { password: hashedPassword });
  }

  // Recuperer tous les utilisateurs avec details (pour admin)
  async findAllWithDetails(): Promise<User[]> {
    return prisma.user.findMany({
      include: {
        _count: {
          select: {
            announces: true,
            reservations: true,
            reviews: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Mettre a jour le role d'un utilisateur
  async updateRole(id: number, role: 'USER' | 'ADMIN'): Promise<User | null> {
    return this.update(id, { role: role as UserRole });
  }
}
