import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { TaskSocketService } from './services/task-socket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>TeamOps Realtime Test</h1>
    <p>Open DevTools Console</p>
  `,
})
export class App implements OnInit, OnDestroy {
  private sub!: Subscription;

  constructor(private ws: TaskSocketService) {}

  ngOnInit() {
    const projectId = 1;
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzY5NTExMDE4LCJpYXQiOjE3Njk1MTA3MTgsImp0aSI6ImMzMTRlNzU3NzIwYTRkMmZhNGZkYzIxYzA2NzUzNDgyIiwidXNlcl9pZCI6IjIifQ.6ifwjnUo1mrrfUjDvL99upd35jsWRWEuN8MpzKpvwcc';

    this.ws.connect(projectId, token);

    this.sub = this.ws.events.subscribe(event => {
      console.log('[APP] realtime event', event);
    });
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
    this.ws.disconnect();
  }
}
