const API_BASE = "/api/v1";

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Registered by AuthContext so the client can force a logout on refresh failure. */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "x-otcms-csrf": "1" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { accessToken: string };
  accessToken = data.accessToken;
  return data.accessToken;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  isFormData?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function rawRequest<T>(path: string, options: RequestOptions, retrying = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  // The two cookie-authenticated endpoints require this header as a CSRF
  // defense-in-depth measure (see backend/src/middleware/csrf.ts) — a
  // cross-site form submission cannot set custom headers, so this is safe
  // for our own same-origin fetch calls to set unconditionally.
  if (path === "/auth/refresh" || path === "/auth/logout") {
    headers["x-otcms-csrf"] = "1";
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    body,
    credentials: "include",
  });

  if (res.status === 401 && !retrying) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return rawRequest<T>(path, options, true);
    onUnauthorized?.();
    throw new ApiError(401, "UNAUTHORIZED", "Session expired");
  }

  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!res.ok) throw new ApiError(res.status, "ERROR", res.statusText);
    return (await res.blob()) as unknown as T;
  }

  const data = await res.json();
  if (!res.ok) {
    const err = data.error ?? { code: "ERROR", message: res.statusText };
    throw new ApiError(res.status, err.code, err.message, err.details);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => rawRequest<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => rawRequest<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => rawRequest<T>(path, { method: "DELETE" }),
  postForm: <T>(path: string, formData: FormData) => rawRequest<T>(path, { method: "POST", body: formData, isFormData: true }),
};
