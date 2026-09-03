import type { LoginPayload, RegisterPayload, AuthResponse } from '../types/auth.types';
import { apiClient, isApiEnabled } from '../lib/apiClient';

const SIMULATED_NETWORK_DELAY_MS = 1000;

const MOCK_CREDENTIALS = {
  email: 'alex.rodriguez@huecko.com',
  password: 'demo1234',
} as const;

const MOCK_AUTH_RESPONSE: AuthResponse = {
  token: 'mock-jwt-token-huecko-2026',
  user: {
    id: '1',
    nombre: 'Alex Rodríguez',
    email: MOCK_CREDENTIALS.email,
    creado_en: new Date().toISOString(),
  },
};

const simulateNetworkDelay = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, SIMULATED_NETWORK_DELAY_MS));

const isValidMockCredentials = (payload: LoginPayload): boolean =>
  payload.email === MOCK_CREDENTIALS.email &&
  payload.password === MOCK_CREDENTIALS.password;

export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  if (isApiEnabled) {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', payload);
    return data;
  }

  await simulateNetworkDelay();

  if (!isValidMockCredentials(payload)) {
    throw new Error('Credenciales incorrectas. Intenta de nuevo.');
  }

  return MOCK_AUTH_RESPONSE;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  if (isApiEnabled) {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    return data;
  }

  await simulateNetworkDelay();

  if (payload.email === MOCK_CREDENTIALS.email) {
    throw new Error('El correo ya está en uso. Intenta con otro.');
  }

  return {
    token: 'mock-jwt-token-new-user-2026',
    user: {
      id: Math.random().toString(36).substring(7),
      nombre: payload.nombre,
      email: payload.email,
      creado_en: new Date().toISOString(),
    },
  };
}
