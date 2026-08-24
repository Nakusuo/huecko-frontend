export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  nombre: string;
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  creado_en: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}
