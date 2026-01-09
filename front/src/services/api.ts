// API Service for ETNAir

// Ajouter /api si pas déjà présent
const getApiUrl = () => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
  // return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  return `${baseUrl}api`
};

const API_URL = getApiUrl();

// Types pour les requêtes et réponses
interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  phone?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
  announces?: Announce[];
  reservations?: Reservation[];
}

export interface AnnounceInfo {
  id: number;
  announcesId: number;
  content?: string;
  address?: string;
  postalCode?: string;
  country?: string;
  capacity?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string;
  rules?: string;
}

export interface AnnouncePicture {
  id: number;
  announcesId: number;
  isCover: boolean;
  url: string;
  filename: string;
  createdAt: string;
}

export interface Announce {
  id: number;
  userId: number;
  title: string;
  description?: string;
  type: 'APARTMENT' | 'HOUSE' | 'VILLA' | 'STUDIO' | 'ROOM' | 'OTHER';
  price: number;
  city?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
  info?: AnnounceInfo;
  pictures?: AnnouncePicture[];
  averageRating?: number | null;
  reviewCount?: number;
}

export interface Reservation {
  id: number;
  userId: number;
  announceId: number;
  title?: string;
  totalPrice: number;
  arriveAt: string;
  leaveAt: string;
  reservedAt: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  city?: string;
  address?: string;
  contactHost?: string;
  guestCount?: number;
  announce?: Announce;
  user?: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  errors?: { field: string; message: string }[];
}

// Helpers pour les tokens
const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

const getRefreshToken = (): string | null => {
  return localStorage.getItem('refreshToken');
};

const setTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

const clearTokens = (): void => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Headers avec authentification
const getAuthHeaders = (): HeadersInit => {
  const token = getAccessToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

// Fonction générique pour les appels API
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  // Si token expiré, essayer de le rafraîchir
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      // Réessayer la requête avec le nouveau token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...getAuthHeaders(),
          ...options.headers,
        },
      });
      if (!retryResponse.ok) {
        const error = await retryResponse.json();
        throw error;
      }
      return retryResponse.json();
    } else {
      clearTokens();
      throw { message: 'Session expirée, veuillez vous reconnecter' };
    }
  }

  if (!response.ok) {
    const error = await response.json();
    throw error;
  }

  // Si 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Rafraîchir le token d'accès
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// ==================== AUTH ====================
export const authApi = {
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiCall<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiCall<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    try {
      await apiCall('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    } finally {
      clearTokens();
    }
  },

  async getMe(): Promise<User> {
    return apiCall<User>('/auth/me');
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },
};

// ==================== USERS ====================
export interface UserWithCounts extends User {
  _count?: {
    announces: number;
    reservations: number;
    reviews: number;
  };
}

export const usersApi = {
  async getAll(page?: number, limit?: number): Promise<User[] | PaginatedResponse<User>> {
    let endpoint = '/users';
    if (page || limit) {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());
      endpoint += `?${params.toString()}`;
    }
    return apiCall(endpoint);
  },

  async getById(id: number): Promise<User> {
    return apiCall<User>(`/users/${id}`);
  },

  async update(id: number, data: Partial<User>): Promise<User> {
    return apiCall<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<void> {
    return apiCall(`/users/${id}`, { method: 'DELETE' });
  },
};

// ==================== ADMIN ====================
export const adminApi = {
  // Récupérer tous les utilisateurs avec détails (admin only)
  async getAllUsers(): Promise<UserWithCounts[]> {
    return apiCall<UserWithCounts[]>('/users/admin/all');
  },

  // Modifier le rôle d'un utilisateur (admin only)
  async updateUserRole(id: number, role: 'USER' | 'ADMIN'): Promise<User> {
    return apiCall<User>(`/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  },

  // Supprimer un utilisateur (admin only)
  async deleteUser(id: number): Promise<void> {
    return apiCall(`/users/admin/${id}`, { method: 'DELETE' });
  },
};

// ==================== ANNOUNCES ====================
export interface AnnounceFilters {
  page?: number;
  limit?: number;
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  capacity?: number;
}

export interface CreateAnnounceData {
  title: string;
  description?: string;
  type: 'APARTMENT' | 'HOUSE' | 'VILLA' | 'STUDIO' | 'ROOM' | 'OTHER';
  price: number;
  city?: string;
  info?: {
    content?: string;
    address?: string;
    postalCode?: string;
    country?: string;
    capacity?: number;
    bedrooms?: number;
    bathrooms?: number;
    amenities?: string;
    rules?: string;
  };
}

export const announcesApi = {
  async getAll(filters?: AnnounceFilters): Promise<Announce[] | PaginatedResponse<Announce>> {
    let endpoint = '/announces';
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
      const queryString = params.toString();
      if (queryString) endpoint += `?${queryString}`;
    }
    return apiCall(endpoint);
  },

  async getById(id: number): Promise<Announce> {
    return apiCall<Announce>(`/announces/${id}`);
  },

  async getByUserId(userId: number): Promise<Announce[]> {
    return apiCall<Announce[]>(`/announces/user/${userId}`);
  },

  async create(data: CreateAnnounceData): Promise<Announce> {
    return apiCall<Announce>('/announces', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: Partial<CreateAnnounceData & { isActive?: boolean }>): Promise<Announce> {
    return apiCall<Announce>(`/announces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<void> {
    return apiCall(`/announces/${id}`, { method: 'DELETE' });
  },
};

// ==================== RESERVATIONS ====================
export interface CreateReservationData {
  announceId: number;
  arriveAt: string;
  leaveAt: string;
  guestCount?: number;
  title?: string;
}

export interface CheckAvailabilityData {
  announceId: number;
  arriveAt: string;
  leaveAt: string;
}

export const reservationsApi = {
  async getAll(page?: number, limit?: number): Promise<Reservation[] | PaginatedResponse<Reservation>> {
    let endpoint = '/reservations';
    if (page || limit) {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());
      endpoint += `?${params.toString()}`;
    }
    return apiCall(endpoint);
  },

  async getById(id: number): Promise<Reservation> {
    return apiCall<Reservation>(`/reservations/${id}`);
  },

  async getByAnnounceId(announceId: number): Promise<Reservation[]> {
    return apiCall<Reservation[]>(`/reservations/announce/${announceId}`);
  },

  async create(data: CreateReservationData): Promise<Reservation> {
    return apiCall<Reservation>('/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateStatus(id: number, status: Reservation['status']): Promise<Reservation> {
    return apiCall<Reservation>(`/reservations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async delete(id: number): Promise<void> {
    return apiCall(`/reservations/${id}`, { method: 'DELETE' });
  },

  async checkAvailability(data: CheckAvailabilityData): Promise<{ available: boolean }> {
    return apiCall<{ available: boolean }>('/reservations/check-availability', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Récupérer les réservations reçues (en tant que propriétaire)
  async getReceived(): Promise<Reservation[]> {
    return apiCall<Reservation[]>('/reservations/received');
  },
};

// ==================== REVIEWS ====================
export interface Review {
  id: number;
  userId: number;
  announceId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  user?: { id: number; username: string };
  announce?: { id: number; title: string; city?: string };
}

export interface CreateReviewData {
  announceId: number;
  rating: number;
  comment?: string;
}

export const reviewsApi = {
  async getByAnnounceId(announceId: number, page?: number, limit?: number): Promise<Review[] | PaginatedResponse<Review>> {
    let endpoint = `/reviews/announce/${announceId}`;
    if (page || limit) {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());
      endpoint += `?${params.toString()}`;
    }
    return apiCall(endpoint);
  },

  async getAnnounceRating(announceId: number): Promise<{ average: number; count: number }> {
    return apiCall<{ average: number; count: number }>(`/reviews/announce/${announceId}/rating`);
  },

  async getByUserId(userId: number, page?: number, limit?: number): Promise<Review[] | PaginatedResponse<Review>> {
    let endpoint = `/reviews/user/${userId}`;
    if (page || limit) {
      const params = new URLSearchParams();
      if (page) params.append('page', page.toString());
      if (limit) params.append('limit', limit.toString());
      endpoint += `?${params.toString()}`;
    }
    return apiCall(endpoint);
  },

  async getById(id: number): Promise<Review> {
    return apiCall<Review>(`/reviews/${id}`);
  },

  async create(data: CreateReviewData): Promise<Review> {
    return apiCall<Review>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async update(id: number, data: { rating?: number; comment?: string }): Promise<Review> {
    return apiCall<Review>(`/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async delete(id: number): Promise<void> {
    return apiCall(`/reviews/${id}`, { method: 'DELETE' });
  },
};

// ==================== FAVORITES ====================
export interface Favorite {
  id: number;
  userId: number;
  announceId: number;
  createdAt: string;
  announce?: Announce;
}

export const favoritesApi = {
  // Récupérer tous les favoris de l'utilisateur connecté
  async getAll(): Promise<Favorite[]> {
    return apiCall<Favorite[]>('/favorites');
  },

  // Vérifier si une annonce est dans les favoris
  async check(announceId: number): Promise<{ isFavorite: boolean }> {
    return apiCall<{ isFavorite: boolean }>(`/favorites/check/${announceId}`);
  },

  // Ajouter une annonce aux favoris
  async add(announceId: number): Promise<Favorite> {
    return apiCall<Favorite>(`/favorites/${announceId}`, {
      method: 'POST',
    });
  },

  // Retirer une annonce des favoris
  async remove(announceId: number): Promise<void> {
    return apiCall(`/favorites/${announceId}`, { method: 'DELETE' });
  },

  // Basculer le statut favori (ajouter/retirer)
  async toggle(announceId: number): Promise<{ isFavorite: boolean }> {
    return apiCall<{ isFavorite: boolean }>(`/favorites/toggle/${announceId}`, {
      method: 'POST',
    });
  },
};

export default {
  auth: authApi,
  users: usersApi,
  admin: adminApi,
  announces: announcesApi,
  reservations: reservationsApi,
  reviews: reviewsApi,
  favorites: favoritesApi,
};
