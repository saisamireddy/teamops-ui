import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export type UserRole = 'ADMIN' | 'PM' | 'DEV';

export interface ManagedUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  is_active: boolean;
  avatar: string | null;
  date_joined: string;
}

type ManagedUsersResponse =
  | ManagedUser[]
  | {
      count?: number;
      next?: string | null;
      previous?: string | null;
      results?: ManagedUser[];
    };

export interface ListUsersQuery {
  search?: string;
  role?: UserRole | '';
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
}

export interface UpdateUserPayload {
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface ResetUserPasswordPayload {
  password: string;
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly baseUrl = `${environment.apiBaseUrl}/api/auth/admin/users/`;

  constructor(private http: HttpClient) {}

  listUsers(query?: ListUsersQuery): Observable<ManagedUser[]> {
    let params = new HttpParams();
    if (query?.search) {
      params = params.set('search', query.search);
    }
    if (query?.role) {
      params = params.set('role', query.role);
    }

    return this.http
      .get<ManagedUsersResponse>(this.baseUrl, { params })
      .pipe(map((response) => this.normalizeListResponse(response)));
  }

  createUser(payload: CreateUserPayload): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(this.baseUrl, payload);
  }

  updateUser(userId: number, payload: UpdateUserPayload): Observable<ManagedUser> {
    return this.http.patch<ManagedUser>(`${this.baseUrl}${userId}/`, payload);
  }

  toggleUserStatus(userId: number): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(`${this.baseUrl}${userId}/toggle_status/`, {});
  }

  resetUserPassword(userId: number, payload: ResetUserPasswordPayload): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}${userId}/reset_password/`, payload);
  }

  private normalizeListResponse(response: ManagedUsersResponse): ManagedUser[] {
    if (Array.isArray(response)) {
      return response;
    }
    if (Array.isArray(response?.results)) {
      return response.results;
    }
    return [];
  }
}
