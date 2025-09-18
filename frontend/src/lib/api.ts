// API 기본 설정
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// API 클래스
class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(baseURL: string) {
    this.baseURL = baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token')
    if (token) {
      return { ...this.defaultHeaders, Authorization: `Bearer ${token}` }
    }
    return this.defaultHeaders
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401) {
        // 토큰이 만료되었거나 유효하지 않음
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
      }

      const error = await response.json().catch(() => ({ message: 'Network error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }

    return response.text() as unknown as T
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<T>(response)
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    })
    return this.handleResponse<T>(response)
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse<T>(response)
  }
}

// API 클라이언트 인스턴스
export const apiClient = new ApiClient(API_BASE_URL)

// 인증 관련 API
export interface LoginRequest {
  username: string
  password: string
  role: string
}

export interface LoginResponse {
  access_token: string
  token_type: string
  user: {
    id: number
    username: string
    role: string
    full_name: string
    email?: string
    phone?: string
  }
}

export const authAPI = {
  login: async (data: Pick<LoginRequest, 'username' | 'password'>): Promise<LoginResponse> => {
    // OAuth2PasswordRequestForm 형식으로 전송
    const formData = new URLSearchParams()
    formData.append('username', data.username)
    formData.append('password', data.password)

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Login failed' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  },

  logout: (): Promise<{ message: string }> =>
    apiClient.post('/api/auth/logout'),

  me: (): Promise<LoginResponse['user']> =>
    apiClient.get('/api/auth/me'),
}

// 노선 관련 API
export interface Route {
  id: number
  name: string
  departure_location: string
  destination: string
  is_active: boolean
  created_at: string
}

export const routeAPI = {
  getAll: (): Promise<Route[]> =>
    apiClient.get('/api/buses/routes'),

  create: (data: Omit<Route, 'id' | 'is_active' | 'created_at'>): Promise<Route> =>
    apiClient.post('/api/buses/routes', data),

  update: (id: number, data: Partial<Omit<Route, 'id' | 'is_active' | 'created_at'>>): Promise<Route> =>
    apiClient.put(`/api/buses/routes/${id}`, data),

  delete: (id: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/buses/routes/${id}`),
}

// 버스 관련 API
export interface Bus {
  id: number
  bus_number: string
  route: string
  departure_time: string
  arrival_time: string
  destination: string
  bus_type: '28-seat' | '45-seat'
  total_seats: number
  available_seats: number
  occupancy_rate: number
}

export const busAPI = {
  getAll: (reservationDate?: string): Promise<Bus[]> => {
    const params = reservationDate ? `?reservation_date=${reservationDate}` : ''
    return apiClient.get(`/api/buses/${params}`)
  },

  getById: (id: number): Promise<Bus> =>
    apiClient.get(`/api/buses/${id}`),

  create: (data: Omit<Bus, 'id' | 'available_seats' | 'occupancy_rate'>): Promise<Bus> =>
    apiClient.post('/api/buses/', data),

  update: (id: number, data: Partial<Bus>): Promise<Bus> =>
    apiClient.put(`/api/buses/${id}/`, data),

  delete: (id: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/buses/${id}/`),

  getMyBuses: (): Promise<Bus[]> =>
    apiClient.get('/api/buses/driver/my-buses'),

  getMyBus: (reservationDate?: string): Promise<Bus> => {
    const params = reservationDate ? `?reservation_date=${reservationDate}` : ''
    return apiClient.get(`/api/buses/driver/my-bus${params}`)
  },

  getSeats: (busId: number, reservationDate: string): Promise<{
    bus_id: number
    bus_type: string
    total_seats: number
    reserved_seats: number
    available_seats: number
    reserved_seat_numbers: string[]
  }> => {
    return apiClient.get(`/api/buses/${busId}/seats?reservation_date=${reservationDate}`)
  },
}

// 예약 관련 API
export interface Reservation {
  id: number
  user_id: number
  bus_id: number
  seat_number: string
  reservation_date: string
  departure_time: string
  status: 'confirmed' | 'cancelled'
  bus_number?: string
  route?: string
  bus_type?: '28-seat' | '45-seat'
  full_name?: string
  phone?: string
}

export const reservationAPI = {
  getAll: (): Promise<Reservation[]> =>
    apiClient.get('/api/reservations/'),

  getUserReservations: (): Promise<Reservation[]> =>
    apiClient.get('/api/reservations/user'),

  create: (data: { bus_id: number; seat_numbers: string[]; reservation_date: string }): Promise<Reservation[]> =>
    apiClient.post('/api/reservations/', data),

  cancel: (id: number): Promise<{ message: string }> =>
    apiClient.delete(`/api/reservations/${id}/`),
}

// 관리자 관련 API
export interface DashboardStats {
  total_users: number
  total_buses: number
  total_routes: number
  today_reservations: number
}

export const adminAPI = {
  getStats: (): Promise<DashboardStats> =>
    apiClient.get('/api/admin/dashboard'),

  getAllUsers: (): Promise<LoginResponse['user'][]> =>
    apiClient.get('/api/admin/users'),

  createDirectReservation: (data: { user_id: number; bus_id: number; seat_numbers: string[] }): Promise<Reservation[]> =>
    apiClient.post('/api/admin/reservations/direct', data),
}

// 사용자 관련 API
export const userAPI = {
  getDrivers: (): Promise<LoginResponse['user'][]> =>
    apiClient.get('/api/users/drivers'),
}

// 에러 타입
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}