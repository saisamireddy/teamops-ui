import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
@Injectable({
  providedIn: 'root',
})

export class TaskSocketService {
  private socket: WebSocket | null = null;
  private events$ = new Subject<any>();

  constructor(private auth: AuthService) {}

  connect(projectId: number) {
    const token = this.auth.getToken();
    if (!token) {
      console.warn('[WS] No token found, aborting connection');
      return;
    }
    const url = `ws://127.0.0.1:8000/ws/projects/${projectId}/?token=${token}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WS] connected');
    };

    this.socket.onmessage = e => this.events$.next(JSON.parse(e.data));

    this.socket.onclose = () => {
      console.warn('[WS] disconnected');
    };

    this.socket.onerror = () => this.socket?.close();
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }

  get events() {
    return this.events$.asObservable();
  }
}
