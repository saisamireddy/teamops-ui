import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskSocketService } from '../../../core/services/task-socket.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  templateUrl: './task-list.component.html',
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: any[] = [];

  private routeSub!: Subscription;
  private wsSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private ws: TaskSocketService
  ) {}

  ngOnInit() {
    // 1️⃣ Subscribe ONCE to websocket events
    this.wsSub = this.ws.events.subscribe(event => {
      console.log('[WS EVENT]', event);
      this.handleEvent(event);
    });

    // 2️⃣ React to route changes separately
    this.routeSub = this.route.paramMap.subscribe(params => {
      const projectId = Number(params.get('projectId'));
      if (!projectId) return;

      console.log('[ROUTE] switching to project', projectId);

      this.ws.disconnect();
      this.ws.connect(projectId);
    });
  }

  handleEvent(event: any) {
  if (event.entity !== 'task') return;

  const task = event.data;

  switch (event.action) {
    case 'CREATED':
    case 'RESTORED':
      if (!this.tasks.find(t => t.id === task.id)) {
        this.tasks.push(task);
      }
      break;

    case 'UPDATED':
      this.tasks = this.tasks.map(t =>
        t.id === task.id ? task : t
      );
      break;

    case 'DELETED':
      this.tasks = this.tasks.filter(t => t.id !== task.id);
      break;
  }
}


  ngOnDestroy() {
    this.routeSub.unsubscribe();
    this.wsSub.unsubscribe();
    this.ws.disconnect();
  }
}
