import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
@Injectable({
  providedIn: 'root',
})

export class TaskSocketService {
  private socket: WebSocket | null = null;
  private events$ = new Subject<any>();

  private reconnectAttempts = 0;
  private readonly MAX_RETRIES = 5;
  private readonly BASE_DELAY = 1000; // 1s
  private activeProjectId: number | null = null;
  private manuallyClosed = false;

  constructor(private auth: AuthService) {}

  connect(projectId: number) {
    if (!this.auth.isAuthenticated()) return;

    // Prevent duplicate connections
    if (
    this.socket &&
    this.socket.readyState === WebSocket.OPEN &&
    this.activeProjectId === projectId
  ) {
    return;
  }

    this.disconnect(false);

    this.activeProjectId = projectId;
    this.manuallyClosed = false;

    const token = this.auth.getToken();
    if (!token) return;

    const url = `ws://127.0.0.1:8000/ws/projects/${projectId}/?token=${token}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WS] connected');
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = e => {
      this.events$.next(JSON.parse(e.data));
    };

    this.socket.onclose = () => {
      console.warn('[WS] disconnected');

      if (this.manuallyClosed) return;
   if (this.reconnectAttempts >= this.MAX_RETRIES) {
    console.warn('[WS] max reconnect attempts reached');
    return;
  }
      const delay = this.BASE_DELAY * Math.pow(2, this.reconnectAttempts);
      console.log(`[WS] reconnecting in ${delay}ms`);
      this.reconnectAttempts++;

      setTimeout(() => {
        if (this.activeProjectId) {
          this.connect(this.activeProjectId);
        }
      }, delay);
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

disconnect(manual = true) {
  this.manuallyClosed = manual;

  this.socket?.close();
  this.socket = null;

  //  Only clear project intent on manual disconnect
  if (manual) {
    this.activeProjectId = null;
  }
}

  get events() {
    return this.events$.asObservable();
  }

}
