import { toast } from "sonner";

import { env } from "@/env";
import { SESSION_TOKEN } from "@/helper/storage";

export type ConnectOptions = {
  revalidate?: number | false;
} & RequestInit;

async function connect<T = unknown>(
  endpoint: string,
  options: ConnectOptions = {},
): Promise<T> {
  const token = typeof window !== "undefined" ? SESSION_TOKEN.get() : null;

  try {
    const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      // ✅ Next.js cache control
      cache: options.revalidate === false ? "no-store" : "force-cache",
      next: options.revalidate ? { revalidate: options.revalidate } : undefined,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));

      if (typeof window !== "undefined") {
        switch (res.status) {
          case 401:
            toast.error(errorData?.message || "Unauthorized");
            sessionStorage.clear();
            break;
          case 403:
            toast.error(errorData?.message || "Forbidden");
            break;
          case 404:
            toast.error(errorData?.message || "Data not found");
            break;
          case 500:
            toast.error("Something went wrong");
            break;
          default:
            toast.error(errorData?.message || "Error occurred");
        }
      }
      return Promise.reject(errorData?.message || `HTTP Error ${res.status}`);
    }

    return (await res.json()) as T;
  } catch (error: unknown) {
    console.error("API Fetch Error:", error);
    throw error;
  }
}

export const apiFetch = {
  get: <T>(url: string, options?: ConnectOptions) =>
    connect<T>(url, { ...options, method: "GET" }),
  post: <T>(url: string, body?: unknown, options?: ConnectOptions) =>
    connect<T>(url, { ...options, method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body?: unknown, options?: ConnectOptions) =>
    connect<T>(url, { ...options, method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string, options?: ConnectOptions) =>
    connect<T>(url, { ...options, method: "DELETE" }),
};
