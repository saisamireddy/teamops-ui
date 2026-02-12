import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';

  private authenticated$ = new BehaviorSubject<boolean>(
    !!localStorage.getItem(this.TOKEN_KEY)
  );

  constructor(private http: HttpClient) {}

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
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('last_project_id');
    this.authenticated$.next(false);
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
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      const roleValue =
        payload?.role ??
        payload?.user_role ??
        payload?.user?.role ??
        (Array.isArray(payload?.roles) ? payload.roles[0] : null);

      if (typeof roleValue !== 'string') return null;
      const normalized = roleValue.toUpperCase();
      if (normalized === 'ADMIN' || normalized === 'PM' || normalized === 'DEV') {
        return normalized;
      }
      return null;
    } catch {
      return null;
    }
  }

  canCreateProjects(): boolean {
    const role = this.getUserRole();
    return role === 'ADMIN' || role === 'PM';
  }
}
