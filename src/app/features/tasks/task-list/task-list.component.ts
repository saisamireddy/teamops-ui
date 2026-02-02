import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskSocketService } from '../../../core/services/task-socket.service';
import { ProjectContextService } from '../../../core/services/project-context.service';
import { Task } from '../../../core/models/task.model';
import { TaskService } from '../../../core/services/task.service';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-task-list',
  standalone: true,
  templateUrl: './task-list.component.html',
  imports: [CommonModule]
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];

  //  Idempotency guard: taskId → last updated_at
  private taskVersions = new Map<number, string>();

  private routeSub!: Subscription;
  private wsSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private ws: TaskSocketService,
    private projectContext: ProjectContextService,
    private taskService: TaskService
  ) {}

  ngOnInit() {
   
    this.wsSub = this.ws.events.subscribe(event => {
      this.handleEvent(event);
    });

    
    this.routeSub = this.route.paramMap.subscribe(params => {
      const projectId = Number(params.get('projectId'));
      if (!projectId) return;
        this.projectContext.setProject(projectId);
        this.loadTasks(projectId);
      
    });
  }

    private loadTasks(projectId: number) {
    this.taskService.getTasks(projectId).subscribe(tasks => {
      this.tasks = tasks;

      // Seed idempotency map
      this.taskVersions.clear();
      tasks.forEach(task => {
        this.taskVersions.set(task.id, task.updated_at);
      });
    });
  }

  handleEvent(event: any) {
    if (!event || event.entity !== 'task' || !event.action || !event.data) {
      return;
    }

    const task: Task = event.data;

    //  IDEMPOTENCY CHECK
    const lastVersion = this.taskVersions.get(task.id);
    if (lastVersion && lastVersion >= task.updated_at) {
      return; 
    }

    // Record newest version
    this.taskVersions.set(task.id, task.updated_at);

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
