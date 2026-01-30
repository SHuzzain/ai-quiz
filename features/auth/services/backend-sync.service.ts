/**
 * Backend Synchronization Service
 * Handles syncing Clerk users with the custom backend API.
 */

interface SyncUserResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
  message?: string;
}

export async function syncUserWithBackend(
  clerkUserId: string,
  email: string,
  name?: string,
  role?: "student" | "admin",
): Promise<SyncUserResponse> {
  const BACKEND_URL =
    process.env.NEXT_PUBLIC_BACKEND_API_URL ||
    "http://localhost:3001/api/users/sync";

  try {
    const response = await fetch(BACKEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clerkUserId,
        email,
        name,
        role,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Failed to sync user with backend");
    }

    return await response.json();
  } catch (error) {
    console.error("Error syncing user with backend:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error during sync",
    };
  }
}
