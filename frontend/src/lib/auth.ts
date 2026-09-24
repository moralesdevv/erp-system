import apiClient from './api-client';
import Cookies from 'js-cookie';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', credentials);

  // Store access token in a cookie (HttpOnly would be better but requires server-side)
  Cookies.set('accessToken', data.accessToken, {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: 1 / 96, // 15 minutes
  });

  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    Cookies.remove('accessToken');
    window.location.href = '/login';
  }
}

export async function getCurrentUser(): Promise<AuthUser> {
  const { data } = await apiClient.get<AuthUser>('/auth/me');
  return data;
}

export function hasRole(user: AuthUser | null, ...roles: string[]): boolean {
  if (!user) return false;
  if (user.roles.includes('super_admin')) return true;
  return roles.some((role) => user.roles.includes(role));
}

export function hasPermission(user: AuthUser & { permissions?: string[] }, permission: string): boolean {
  if (!user) return false;
  if (user.roles.includes('super_admin')) return true;
  return user.permissions?.includes(permission) ?? false;
}
