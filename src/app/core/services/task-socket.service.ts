import { Injectable, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { AuthService } from './auth.service';
import { ProjectContextService } from './project-context.service';

@Injectable({ providedIn: 'root' })
export class TaskSocketService implements OnDestroy {
  private socket: WebSocket | null = null;
  private events$ = new Subject<any>();

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

    const url = `ws://127.0.0.1:8000/ws/projects/${projectId}/?token=${token}`;
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

  ngOnDestroy() {
    this.projectSub.unsubscribe();
    this.close(true);
  }
}
