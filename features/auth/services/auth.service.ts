import { User, UserRole } from "@/types";
import { mockUsers } from "@/mocks/data";
import { LoginCredentials, SignUpData } from "../types/auth.types";

// Simulate network delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const MOCK_DELAY = 500;

/**
 * Mock login - checks against mock users
 */
export async function loginUser(credentials: LoginCredentials): Promise<User> {
  await delay(MOCK_DELAY);

  const user = mockUsers.find((u) => u.email === credentials.email);

  if (!user) {
    throw new Error("Invalid email or password");
  }

  // Store in localStorage for demo purposes
  localStorage.setItem("currentUser", JSON.stringify(user));

  return user;
}

/**
 * Mock signup
 */
export async function signUpUser(data: SignUpData): Promise<User> {
  await delay(MOCK_DELAY);

  const existingUser = mockUsers.find((u) => u.email === data.email);
  if (existingUser) {
    throw new Error("Email already exists");
  }

  const newUser: User = {
    id: `user-${Date.now()}`,
    email: data.email,
    name: data.name,
    role: data.role,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
    createdAt: new Date(),
    lastActiveAt: new Date(),
  };

  localStorage.setItem("currentUser", JSON.stringify(newUser));

  return newUser;
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
  await delay(300);

  const stored = localStorage.getItem("currentUser");
  if (stored) {
    return JSON.parse(stored);
  }

  return null;
}

/**
 * Logout user
 */
export async function logoutUser(): Promise<void> {
  await delay(300);
  localStorage.removeItem("currentUser");
}
