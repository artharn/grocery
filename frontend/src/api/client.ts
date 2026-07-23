import type { ApiResponse } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

const ACCESS_TOKEN_KEY = "grocery.accessToken";
const REFRESH_TOKEN_KEY = "grocery.refreshToken";

export class ApiError extends Error {
  code: string;
  status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

// localStorage (not an httpOnly cookie) is a deliberate, documented
// tradeoff — see fe-standard.md §4.
export const tokenStorage = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// AuthContext registers itself here so a 401 from anywhere in the app
// (not just the login form) triggers the same logout/redirect flow.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: () => void) => {
  onUnauthorized = handler;
};

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {
    // The backend is currently tunneled through ngrok's free tier, which
    // serves a browser-warning interstitial page (HTML, not JSON) to any
    // GET request with a browser User-Agent unless this header is sent.
    // POST/PUT/DELETE aren't affected, only GETs — harmless no-op against
    // any other host, so left unconditional rather than env-gated.
    "ngrok-skip-browser-warning": "true",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = tokenStorage.getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Check your connection.", "NETWORK_ERROR", 0);
  }

  const json = (await response.json()) as ApiResponse<T>;

  if (!json.success) {
    if (response.status === 401 && auth && onUnauthorized) {
      onUnauthorized();
    }
    throw new ApiError(json.error.message, json.error.code, response.status);
  }

  return json.data;
}
