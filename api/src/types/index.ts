// Types personnalises pour l'API ETNAir

import { Request } from 'express';

// Extension du type Request pour l'authentification
export interface AuthRequest extends Request {
  userId?: number;
  userRole?: string;
}

// Types pour les reponses API
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: any[];
}

// Types pour la pagination
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

// Types pour les filtres de recherche d'annonces
export interface AnnounceSearchFilters {
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
  arriveAt?: Date;
  leaveAt?: Date;
}

// Types pour la creation de reservation
export interface CreateReservationInput {
  announceId: number;
  arriveAt: Date;
  leaveAt: Date;
  guestCount?: number;
  title?: string;
}

// Types pour l'upload d'images
export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// Export des enums depuis Prisma pour reutilisation
export { UserRole, AnnounceType, ReservationStatus } from '@prisma/client';
