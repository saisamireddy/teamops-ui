import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root',
})

export class TaskSocketService {
  private socket: WebSocket | null = null;
  private events$ = new Subject<any>();

  connect(projectId: number, token: string) {
    const url = `ws://127.0.0.1:8000/ws/projects/${projectId}/?token=${token}`;
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[WS] connected');
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[WS] message received', data);
      this.events$.next(data);
    };

    this.socket.onclose = () => {
      console.warn('[WS] disconnected');
    };

    this.socket.onerror = (err) => {
      console.error('[WS] error', err);
    };
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }

  get events() {
    return this.events$.asObservable();
  }
}
