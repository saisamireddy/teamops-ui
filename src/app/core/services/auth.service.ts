import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly AUTH_DEBUG_KEY = 'debug_auth';
  private readonly role$ = new BehaviorSubject<'ADMIN' | 'PM' | 'DEV' | null>(null);

  private authenticated$ = new BehaviorSubject<boolean>(
    !!localStorage.getItem(this.TOKEN_KEY)
  );

  constructor(private http: HttpClient) {
    if (this.getToken()) {
      this.hydrateRoleFromTokenOrApi();
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

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${environment.apiBaseUrl}/api/auth/login/`, {
      username,
      password,
    }).pipe(
      tap(response => {
        localStorage.setItem(this.TOKEN_KEY, response.access);
        this.authenticated$.next(true);
        this.hydrateRoleFromTokenOrApi();
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('last_project_id');
    this.authenticated$.next(false);
    this.role$.next(null);
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

  getUserRole(): 'ADMIN' | 'PM' | 'DEV' | null {
    const token = this.getToken();
    if (!token) {
      this.debugAuth('getUserRole: no token found');
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      this.debugAuth('getUserRole: token payload', payload);
      const isTokenAdmin =
        payload?.is_admin === true ||
        payload?.is_staff === true ||
        payload?.is_superuser === true ||
        payload?.user?.is_admin === true ||
        payload?.user?.is_staff === true ||
        payload?.user?.is_superuser === true;

      if (isTokenAdmin) {
        this.debugAuth('getUserRole: resolved ADMIN from staff/superuser/admin flags');
        return 'ADMIN';
      }

      const roleValue =
        payload?.role ??
        payload?.user_role ??
        payload?.user?.role ??
        (Array.isArray(payload?.roles) ? payload.roles[0] : null);

      if (typeof roleValue !== 'string') return this.role$.value;
      const normalized = roleValue.toUpperCase();
      if (normalized === 'ADMIN' || normalized === 'PM' || normalized === 'DEV') {
        this.debugAuth('getUserRole: resolved from role field', normalized);
        return normalized;
      }
      this.debugAuth('getUserRole: role field present but unsupported', roleValue);
      return this.role$.value;
    } catch {
      this.debugAuth('getUserRole: failed to parse token payload');
      return this.role$.value;
    }
  }

  canCreateProjects(): boolean {
    const role = this.getUserRole();
    return role === 'ADMIN' || role === 'PM';
  }

  isAdmin(): boolean {
    const token = this.getToken();
    if (!token) {
      this.debugAuth('isAdmin: no token found');
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      this.debugAuth('isAdmin: token payload', payload);
      if (
        payload?.is_admin === true ||
        payload?.is_staff === true ||
        payload?.is_superuser === true ||
        payload?.user?.is_admin === true ||
        payload?.user?.is_staff === true ||
        payload?.user?.is_superuser === true
      ) {
        this.debugAuth('isAdmin: true via admin/staff/superuser flags');
        return true;
      }
    } catch {
      this.debugAuth('isAdmin: failed to parse token payload');
      return this.role$.value === 'ADMIN';
    }

    const isAdminByRole = this.getUserRole() === 'ADMIN';
    this.debugAuth('isAdmin: fallback role check result', isAdminByRole);
    return isAdminByRole;
  }

  roleState(): Observable<'ADMIN' | 'PM' | 'DEV' | null> {
    return this.role$.asObservable();
  }

  private hydrateRoleFromTokenOrApi(): void {
    const tokenRole = this.getRoleFromToken();
    if (tokenRole) {
      this.role$.next(tokenRole);
      return;
    }

    this.http
      .get<{ role?: string | null }>(`${environment.apiBaseUrl}/api/auth/users/me/`)
      .pipe(
        map((response) => this.normalizeRole(response?.role ?? null)),
        catchError(() => {
          this.debugAuth('hydrateRoleFromTokenOrApi: failed to fetch role from API');
          return of(null);
        })
      )
      .subscribe((role) => {
        this.role$.next(role);
        this.debugAuth('hydrateRoleFromTokenOrApi: resolved role', role);
      });
  }

  private getRoleFromToken(): 'ADMIN' | 'PM' | 'DEV' | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const roleValue =
        payload?.role ??
        payload?.user_role ??
        payload?.user?.role ??
        (Array.isArray(payload?.roles) ? payload.roles[0] : null);

      return this.normalizeRole(roleValue);
    } catch {
      return null;
    }
  }

  private normalizeRole(roleValue: unknown): 'ADMIN' | 'PM' | 'DEV' | null {
    if (typeof roleValue !== 'string') {
      return null;
    }

    const normalized = roleValue.toUpperCase();
    if (normalized === 'ADMIN' || normalized === 'PM' || normalized === 'DEV') {
      return normalized;
    }

    return null;
  }

  private debugAuth(message: string, data?: unknown): void {
    if (localStorage.getItem(this.AUTH_DEBUG_KEY) !== '1') {
      return;
    }

    if (data === undefined) {
      console.log(`[AuthDebug] ${message}`);
      return;
    }
    console.log(`[AuthDebug] ${message}`, data);
  }
}
