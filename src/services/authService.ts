import type { LoginPayload, AuthResponse } from '../types/auth.types';

// ─── Mock credentials ───────────────────────────────────────────────────────
const MOCK_USER = {
  email: 'demo@huecko.com',
  password: 'demo1234',
};

const MOCK_RESPONSE: AuthResponse = {
  token: 'mock-jwt-token-huecko-2026',
  user: {
    id: '1',
    nombre: 'Demo User',
    email: 'demo@huecko.com',
    creado_en: new Date().toISOString(),
  },
};

// ─── Service ─────────────────────────────────────────────────────────────────
// TODO: Reemplazar con llamada real al backend Spring Boot
// POST /api/auth/login  →  { token, user }
export async function loginUser(payload: LoginPayload): Promise<AuthResponse> {
  // Simula latencia de red
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (
    payload.email === MOCK_USER.email &&
    payload.password === MOCK_USER.password
  ) {
    return MOCK_RESPONSE;
  }

  throw new Error('Credenciales incorrectas. Intenta de nuevo.');
}
