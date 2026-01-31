import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskSocketService } from '../../../core/services/task-socket.service';
import { ProjectContextService } from '../../../core/services/project-context.service';

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
    private ws: TaskSocketService,
    private projectContext: ProjectContextService
  ) {}

  ngOnInit() {
    
    this.wsSub = this.ws.events.subscribe(event => {
      this.handleEvent(event);
    });

    this.routeSub = this.route.paramMap.subscribe(params => {
      const projectId = Number(params.get('projectId'));
      if (projectId) {
        this.projectContext.setProject(projectId);
      }
    });
  }

  handleEvent(event: any) {
    if (!event || event.entity !== 'task' || !event.action || !event.data) {
      return;
    }

    const task = event.data;

    switch (event.action) {
      case 'CREATED':
      case 'RESTORED':
        this.tasks = [...this.tasks.filter(t => t.id !== task.id), task];
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
    this.wsSub.unsubscribe();
    this.routeSub.unsubscribe();

    this.projectContext.clearProject();
  }
}
