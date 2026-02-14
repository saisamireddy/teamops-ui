import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

type UserRole = 'ADMIN' | 'PM' | 'DEV';

export interface AuthUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole | string;
  is_active?: boolean;
  avatar?: string | null;
  date_joined?: string;
}

export interface LoginResponse {
  access: string;
  refresh?: string;
  user: AuthUser;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'auth_user';
  private readonly role$ = new BehaviorSubject<UserRole | null>(null);
  readonly currentUser = signal<AuthUser | null>(this.getStoredUser());

  private authenticated$ = new BehaviorSubject<boolean>(
    !!localStorage.getItem(this.TOKEN_KEY)
  );

  constructor(private http: HttpClient) {
    const token = this.getToken();
    if (!token) {
      this.clearStoredUser();
      this.currentUser.set(null);
      this.role$.next(null);
      return;
    }

    const roleFromStoredUser = this.getRoleFromUser(this.currentUser());
    const roleFromToken = this.getRoleFromToken();
    this.role$.next(roleFromStoredUser ?? roleFromToken);

    if (!this.currentUser() && roleFromToken) {
      this.currentUser.set({
        id: 0,
        email: '',
        first_name: '',
        last_name: '',
        role: roleFromToken,
      });
    }
  }

  register(data: {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
}) {
  return this.http.post(
    `${environment.apiBaseUrl}/api/auth/register/`,
    data
  );
}

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiBaseUrl}/api/auth/login/`, {
      username,
      password,
    }).pipe(
      tap(response => {
        const normalizedUser = this.normalizeUser(response.user);
        localStorage.setItem(this.TOKEN_KEY, response.access);
        localStorage.setItem(this.USER_KEY, JSON.stringify(normalizedUser));
        this.currentUser.set(normalizedUser);
        this.role$.next(this.getRoleFromUser(normalizedUser));
        this.authenticated$.next(true);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem('last_project_id');
    this.authenticated$.next(false);
    this.role$.next(null);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.authenticated$.value;
  }

  authState(): Observable<boolean> {
    return this.authenticated$.asObservable();
  }

  getUserRole(): UserRole | null {
    return this.role$.value ?? this.getRoleFromUser(this.currentUser()) ?? this.getRoleFromToken();
  }

  canCreateProjects(): boolean {
    const role = this.getUserRole();
    return role === 'ADMIN' || role === 'PM';
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'ADMIN';
  }

  roleState(): Observable<UserRole | null> {
    return this.role$.asObservable();
  }

  private getRoleFromToken(): UserRole | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = this.decodeJwtPayload(token);
      return this.getRoleFromProfile(payload);
    } catch {
      return null;
    }
  }

  private getRoleFromUser(user: AuthUser | null): UserRole | null {
    if (!user) {
      return null;
    }
    return this.getRoleFromProfile(user);
  }

  private getRoleFromProfile(data: unknown): UserRole | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const profile = data as {
      is_admin?: boolean;
      is_staff?: boolean;
      is_superuser?: boolean;
      user?: { is_admin?: boolean; is_staff?: boolean; is_superuser?: boolean; role?: string | null };
      role?: string | null;
      user_role?: string | null;
      roles?: string[] | null;
    };

    const isAdminFlag =
      profile.is_admin === true ||
      profile.is_staff === true ||
      profile.is_superuser === true ||
      profile.user?.is_admin === true ||
      profile.user?.is_staff === true ||
      profile.user?.is_superuser === true;

    if (isAdminFlag) {
      return 'ADMIN';
    }

    const roleValue =
      profile.role ??
      profile.user_role ??
      profile.user?.role ??
      (Array.isArray(profile.roles) ? profile.roles[0] : null);

    return this.normalizeRole(roleValue);
  }

  private normalizeRole(roleValue: unknown): UserRole | null {
    if (typeof roleValue !== 'string') {
      return null;
    }

    const normalized = roleValue.toUpperCase();
    if (normalized === 'ADMIN' || normalized === 'PM' || normalized === 'DEV') {
      return normalized;
    }

    return null;
  }

  private decodeJwtPayload(token: string): any {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      return null;
    }

    // Support both base64url and base64 payload formats.
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(normalized + padding));
  }

  private getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as AuthUser;
      if (!parsed || typeof parsed !== 'object') {
        return null;
      }
      return this.normalizeUser(parsed);
    } catch {
      return null;
    }
  }

  private clearStoredUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  private normalizeUser(user: AuthUser): AuthUser {
    const normalizedRole = this.normalizeRole(user.role) ?? user.role;
    return { ...user, role: normalizedRole };
  }
}
