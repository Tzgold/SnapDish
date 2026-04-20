import { API_BASE_URL } from '@/src/config/api';
import { authClient } from '@/src/lib/auth-client';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const cookie = authClient.getCookie();
  if (cookie) {
    headers.set('Cookie', cookie);
  }
  if (init?.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'omit',
  });
}
