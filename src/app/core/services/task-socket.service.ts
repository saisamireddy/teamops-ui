import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { ProjectContextService } from './project-context.service';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TaskSocketService implements OnDestroy {
  private socket: WebSocket | null = null;
  private events$ = new Subject<unknown>();

  private reconnectAttempts = 0;
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY = 1000;

  private projectSub: Subscription;
  private currentProjectId: number | null = null;
  private manuallyClosed = false;

  constructor(
    private auth: AuthService,
    private projectContext: ProjectContextService
  ) {
    
    this.projectSub = this.projectContext.getProject().subscribe(projectId => {
      if (!projectId) {
        this.close(true);
        return;
      }

      if (projectId === this.currentProjectId) return;

      this.currentProjectId = projectId;
      this.open(projectId);
    });
  }

  private open(projectId: number) {
    if (!this.auth.isAuthenticated()) return;

    this.close(false);

    const token = this.auth.getToken();
    if (!token) return;

    this.manuallyClosed = false;

    const url = this.buildSocketUrl(projectId, token);
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = e => {
      this.events$.next(JSON.parse(e.data));
    };

    this.socket.onclose = () => {
      if (this.manuallyClosed) return;

      if (this.reconnectAttempts >= this.MAX_RETRIES) {
        return;
      }

      const delay = this.BASE_DELAY * Math.pow(2, this.reconnectAttempts++);
      setTimeout(() => {
        if (this.currentProjectId) {
          this.open(this.currentProjectId);
        }
      }, delay);
    };

    this.socket.onerror = () => {
      this.events$.next({ type: 'WS_ERROR' });
      this.socket?.close();
    };
  }

  
  private close(manual: boolean) {
    this.manuallyClosed = manual;

    if (this.socket) {
      
      this.socket.onclose = null;
      this.socket.close();
    }

    this.socket = null;

    if (manual) {
      this.currentProjectId = null;
    }
  }

  get events() {
    return this.events$.asObservable();
  }

  private buildSocketUrl(projectId: number, token: string): string {
    const configuredBase = environment.apiBaseUrl?.trim();
    const base = configuredBase || window.location.origin;

    try {
      const apiUrl = new URL(base, window.location.origin);
      const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${apiUrl.host}/ws/projects/${projectId}/?token=${encodeURIComponent(token)}`;
    } catch {
      const fallbackProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${fallbackProtocol}//${window.location.host}/ws/projects/${projectId}/?token=${encodeURIComponent(token)}`;
    }
  }

  ngOnDestroy() {
    this.projectSub.unsubscribe();
    this.close(true);
  }
}
