/**
 * Auth-related types
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  companyName: string;
  companySlug?: string;
  firstName?: string;
  lastName?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserInfo {
  userId: string;
  customerId: string;
  email: string;
  roles: string[];
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: UserInfo;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

