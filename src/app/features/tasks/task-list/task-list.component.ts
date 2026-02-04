import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { TaskSocketService } from '../../../core/services/task-socket.service';
import { ProjectContextService } from '../../../core/services/project-context.service';
import { Task } from '../../../core/models/task.model';
import { TaskService } from '../../../core/services/task.service';
import { CommonModule } from '@angular/common';
import { TaskFilter } from '../models/task-filter.model';
import { FormsModule } from '@angular/forms';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-task-list',
  standalone: true,
  templateUrl: './task-list.component.html',
  imports: [CommonModule,FormsModule]
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  visibleTasks: any[] = [];

  filters: TaskFilter = {};

  //  Idempotency guard: taskId → last updated_at
  private taskVersions = new Map<number, string>();

  private routeSub!: Subscription;
  private wsSub!: Subscription;
  private currentProjectId: number | null = null;
  private hydrated = false;

  constructor(
    private route: ActivatedRoute,
    private ws: TaskSocketService,
    private projectContext: ProjectContextService,
    private taskService: TaskService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
   
    this.wsSub = this.ws.events.subscribe(event => {
      this.handleEvent(event);
    });

    
    this.routeSub = this.route.paramMap.subscribe(params => {
      const projectId = Number(params.get('projectId'));
      if (!projectId) return;
        this.currentProjectId = projectId;
        this.loadFilters(projectId);
        this.projectContext.setProject(projectId);
        this.loadTasks(projectId);
      
    });
  }

private loadTasks(projectId: number) {
  this.hydrated = false;

  this.taskService.getTasks(projectId).subscribe(tasks => {
    this.tasks = tasks;

 
    this.taskVersions.clear();
    tasks.forEach(task => {
      this.taskVersions.set(task.id, task.updated_at);
    });

    this.hydrated = true;          
    this.applyFilters();
    this.cdr.markForCheck(); 
  });
}


  handleEvent(event: any) {

     if (!this.hydrated) {
    return; 
  }
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
     this.applyFilters();
     this.cdr.markForCheck(); 
  }

private applyFilters() {
  
  let result = [...this.tasks];

  if (this.filters.status) {
    result = result.filter(
      t => t.status === this.filters.status
    );
  }

  if (this.filters.priority) {
    result = result.filter(
      t => t.priority === this.filters.priority
    );
  }

  if (this.filters.assignee) {
    result = result.filter(
      t => t.assigned_to === this.filters.assignee
    );
  }

  this.visibleTasks = result;
}


  onStatusChange(status: string) {
  this.filters.status = status || undefined;
  this.applyFilters();
    this.saveFilters();
}

onPriorityChange(priority: string) {
  this.filters.priority = priority || undefined;
  this.applyFilters();
    this.saveFilters();
}

private saveFilters() {
  if (!this.currentProjectId) return;

  localStorage.setItem(
    `task-filters:${this.currentProjectId}`,
    JSON.stringify(this.filters)
  );
}

private loadFilters(projectId: number) {
  const raw = localStorage.getItem(`task-filters:${projectId}`);

  if (!raw) {
    this.filters = {};
  } else {
    const parsed = JSON.parse(raw);
    this.filters = {
      status: parsed.status || undefined,
      priority: parsed.priority || undefined,
      assignee: parsed.assignee || undefined,
    };
  }

  
  if (this.tasks.length > 0) {
    this.applyFilters();
  }
  this.cdr.markForCheck();
}


  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.routeSub.unsubscribe();

    
    this.projectContext.clearProject();
  }
}
