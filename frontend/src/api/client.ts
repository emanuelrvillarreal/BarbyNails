const TOKEN_KEY = 'barby_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (res.status === 401) {
    // Token vencido o invalido: no tiene sentido dejar la pantalla mostrando
    // "Cargando..." para siempre - se limpia la sesion y se manda al login.
    setToken(null);
    localStorage.removeItem('barby_session');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new ApiError(401, 'Tu sesion expiro, iniciá sesión de nuevo');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? 'Error desconocido');
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
