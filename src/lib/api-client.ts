const STORAGE_KEY = "kid_learns_ai_token";

export function getApiBase(): string {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  if (!url) {
    console.warn("VITE_API_URL is not set; defaulting to http://localhost:4000/api");
    return "http://localhost:4000/api";
  }
  return url.replace(/\/$/, "");
}

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(STORAGE_KEY, token);
  else localStorage.removeItem(STORAGE_KEY);
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const t = getStoredToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  return headers;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      ...authHeaders(),
      ...(init?.headers as Record<string, string>),
    },
  });
  const text = await res.text();
  let json: { success?: boolean; message?: string; data?: T; errors?: unknown } =
    {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new ApiError("Invalid JSON response", res.status);
  }
  if (!res.ok) {
    throw new ApiError(
      (json as { message?: string }).message || res.statusText,
      res.status,
      json,
    );
  }
  if (json.success === false) {
    throw new ApiError(json.message || "Request failed", res.status, json);
  }
  return json.data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch(path, { method: "DELETE" });
}

/** multipart/form-data without JSON Content-Type */
export async function apiUploadFormData<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const url = `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {};
  const t = getStoredToken();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(url, { method: "POST", headers, body: formData });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new ApiError(
      (json as { message?: string }).message || res.statusText,
      res.status,
      json,
    );
  }
  return (json as { data: T }).data;
}
