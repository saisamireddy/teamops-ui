import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'LOGIN' | 'LOGIN_FAILED';

export interface AuditChangeValue {
  old: unknown;
  new: unknown;
}

export interface AuditLogItem {
  id: number;
  action: AuditAction;
  actor_name: string;
  actor_email: string;
  entity_type: string;
  object_id: string;
  changes: Record<string, AuditChangeValue> | null;
  ip_address: string;
  created_at: string;
}

export interface AuditLogsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLogItem[];
}

export interface AuditLogsQuery {
  page?: number;
  action?: string;
  actor?: string;
  start_date?: string;
  end_date?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getAuditLogs(query: AuditLogsQuery): Observable<AuditLogsResponse> {
    let params = new HttpParams();

    if (query.page && query.page > 0) {
      params = params.set('page', String(query.page));
    }
    if (query.action) {
      params = params.set('action', query.action);
    }
    if (query.actor) {
      params = params.set('actor', query.actor);
    }
    if (query.start_date) {
      params = params.set('start_date', query.start_date);
    }
    if (query.end_date) {
      params = params.set('end_date', query.end_date);
    }

    return this.http.get<AuditLogsResponse>(`${this.baseUrl}/api/audit/logs/`, { params });
  }
}
