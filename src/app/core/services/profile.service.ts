import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'ADMIN' | 'PM' | 'DEV' | string;

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  bio?: string | null;
  avatar?: string | null;
  avatar_url?: string | null;
}

export interface UpdateProfilePayload {
  email?: string;
  first_name?: string;
  last_name?: string;
  bio?: string;
  avatar?: File;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/api/auth/users/me/`);
  }

  updateProfile(payload: FormData): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.baseUrl}/api/auth/users/me/`, payload);
  }
}
