const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Bus {
  id: number;
  destination: string;
  departureTime: string;
  capacity: number;
  occupiedSeats: number[];
  driver?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'driver';
}

export interface Reservation {
  id: number;
  userId: number;
  busId: number;
  seatNumber: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API request failed: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  buses: {
    getAll: () => apiRequest<Bus[]>('/api/buses'),
    getById: (id: number) => apiRequest<Bus>(`/api/buses/${id}`),
    create: (data: Omit<Bus, 'id'>) =>
      apiRequest<Bus>('/api/buses', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: Partial<Bus>) =>
      apiRequest<Bus>(`/api/buses/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) =>
      apiRequest<void>(`/api/buses/${id}`, {
        method: 'DELETE',
      }),
  },

  reservations: {
    getAll: () => apiRequest<Reservation[]>('/api/reservations'),
    getByUserId: (userId: number) => apiRequest<Reservation[]>(`/api/reservations/user/${userId}`),
    getByBusId: (busId: number) => apiRequest<Reservation[]>(`/api/reservations/bus/${busId}`),
    create: (data: Omit<Reservation, 'id' | 'createdAt'>) =>
      apiRequest<Reservation>('/api/reservations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancel: (id: number) =>
      apiRequest<void>(`/api/reservations/${id}/cancel`, {
        method: 'PATCH',
      }),
  },

  users: {
    getAll: () => apiRequest<User[]>('/api/users'),
    getById: (id: number) => apiRequest<User>(`/api/users/${id}`),
    create: (data: Omit<User, 'id'>) =>
      apiRequest<User>('/api/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  auth: {
    login: (email: string, password: string) =>
      apiRequest<{ user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    logout: () =>
      apiRequest<void>('/api/auth/logout', {
        method: 'POST',
      }),
  },
};