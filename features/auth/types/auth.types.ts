import { UserRole } from "@/types";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData extends LoginCredentials {
  name: string;
  role: UserRole;
}
