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
import { Assignee } from '../models/assignee.model';
import { CreateTaskComponent } from '../create-task/create-task.component';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectMember } from '../../../core/models/member.model';
import { EditTaskComponent } from '../edit-task/edit-task.component';

@Component({
  selector: 'app-task-list',
  standalone: true,
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
  imports: [CommonModule,FormsModule, CreateTaskComponent, EditTaskComponent]
})
export class TaskListComponent implements OnInit, OnDestroy {
  tasks: Task[] = [];
  visibleTasks: any[] = [];
  lastUpdatedTaskId: number | null = null;

  filters: TaskFilter = {};
  showCreateModal = false;
  projectMembers: ProjectMember[] = [];
  showEditModal = false;
  editingTask: Task | null = null;
  showTrashModal = false;
  trashTasks: Task[] = [];

  //  Idempotency guard: taskId → last updated_at
  private taskVersions = new Map<number, number>();
  

  private routeSub!: Subscription;
  private wsSub!: Subscription;
  currentProjectId: number | null = null;
  private hydrated = false;
  assignees: any;
  //feedback states
  isLoadingTasks = false;
  isSavingTask = false;
  isDeletingTask: number | null = null;
  errorMessage: string | null = null;
  private errorTimeout: any = null;

  constructor(
    private route: ActivatedRoute,
    private ws: TaskSocketService,
    private projectContext: ProjectContextService,
    private taskService: TaskService,
    private projectService: ProjectService, 
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
        this.loadMembers(projectId);
    });
  }

private loadTasks(projectId: number) {
  this.hydrated = false;
  this.isLoadingTasks = true;
  this.errorMessage = null;

  this.taskService.getTasks(projectId).subscribe({
    next: tasks => {
      this.tasks = tasks;

      this.taskVersions.clear();
      tasks.forEach(task => {
       this.taskVersions.set(task.id,new Date(task.updated_at).getTime());
      });

      this.hydrated = true;
      this.isLoadingTasks = false;

      this.errorMessage = null;
      
      this.applyFilters();
      this.cdr.markForCheck();
    },

    error: err => {
      this.showError('Failed to load tasks');
      this.isLoadingTasks = false;
      this.cdr.markForCheck();
    }
  });
}


private loadMembers(projectId: number) {
  
  this.projectService.getProjectMembers(projectId)
    .subscribe(members => {
      this.projectMembers = members;
    });
}
openCreateModal() {
  this.showCreateModal = true;
}

closeCreateModal() {
  this.showCreateModal = false;
}

  handleEvent(event: any) {

     if (!this.hydrated) {
    return; 
  }

  if (event.type === 'WS_ERROR') {
  this.showError('Realtime connection lost');
}
    if (!event || event.entity !== 'task' || !event.action || !event.data) {
      return;
    }

    const task: Task = event.data;

    if (task.optimistic) return;

    //  IDEMPOTENCY CHECK
const incomingTs = new Date(task.updated_at).getTime();
const lastTs = this.taskVersions.get(task.id);

if ( lastTs !== undefined && lastTs >= incomingTs) {
  return;
}

    // Record newest version
    this.taskVersions.set(task.id, incomingTs);

    switch (event.action) {
      case 'CREATED':
      case 'RESTORED':
        this.tasks = this.tasks.filter( t => !(t.optimistic && t.title === task.title));
        this.tasks.push(task);
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
     this.lastUpdatedTaskId = task.id;
    setTimeout(() => {this.lastUpdatedTaskId = null; this.cdr.markForCheck();}, 1500);
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

  if (this.filters.assignee !== undefined) {
  result = result.filter(
    t => t.assigned_to === this.filters.assignee
  );
}

  this.visibleTasks = result;
}


getAvailableAssignees(): Assignee[] {
  const map = new Map<number, string>();

  this.tasks.forEach(t => {
    if (t.assigned_to !== null && t.assigned_username) {
      map.set(t.assigned_to, t.assigned_username);
    }
  });

  return Array.from(map.entries()).map(([id, username]) => ({
    id,
    username,
  }));
}


onAssigneeChange(value: string) {
  this.filters.assignee = value ? Number(value) : undefined;
  this.saveFilters();
  this.applyFilters();
}

onStatusChange(value: string) {
  this.filters.status = value || undefined;
  this.saveFilters();
  this.applyFilters();
}

onPriorityChange(value: string) {
  this.filters.priority = value || undefined;
  this.saveFilters();
  this.applyFilters();
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

clearFilters() {
  if (!this.currentProjectId) return;

  
  delete this.filters.status;
  delete this.filters.priority;
  delete this.filters.assignee;

  // Clear persisted filters
  localStorage.removeItem(`task-filters:${this.currentProjectId}`);

  // Recompute visible tasks
  this.applyFilters();
}

// edit 
openEditModal(task: Task) {
  if (task.is_deleted) return;
  this.editingTask = task;
  this.showEditModal = true;
}

closeEditModal() {
  this.showEditModal = false;
  this.editingTask = null;
}

//delete
deleteTask(taskId: number) {
  this.isDeletingTask = taskId;
  const backup = [...this.tasks];

  this.tasks = this.tasks.filter(t => t.id !== taskId);
  this.applyFilters();

  this.taskService.deleteTask(taskId).subscribe({
    next: () => {
      this.isDeletingTask = null;
    },
    error: () => {
      this.showError('Delete failed');
      this.isDeletingTask = null;
      this.tasks = backup;
      this.applyFilters();
      this.cdr.markForCheck();
    },
  });
}

//restore
restoreTask(taskId: number) {
  this.taskService.restoreTask(taskId).subscribe(() => {
    this.trashTasks = this.trashTasks.filter(t => t.id !== taskId);
  });
}
openTrashModal() {
  this.showTrashModal = true;
  this.loadTrashTasks();
}

private loadTrashTasks() {
  if (!this.currentProjectId) return;

  this.taskService
    .getDeletedTasks(this.currentProjectId)
    .subscribe(tasks => {
      this.trashTasks = tasks;
      this.cdr.markForCheck();
    
    });
}

closeTrashModal() {
  this.showTrashModal = false;
}

addOptimisticTask(task: any) {
  this.tasks = [task, ...this.tasks];
  this.applyFilters();
}
//error handler
private showError(message: string) {
  this.errorMessage = message;

  if (this.errorTimeout) {
    clearTimeout(this.errorTimeout);
  }

  this.errorTimeout = setTimeout(() => {
    this.errorMessage = null;
    this.cdr.markForCheck();
  }, 3500);

  this.cdr.markForCheck();
}

  ngOnDestroy() {
    this.wsSub.unsubscribe();
    this.routeSub.unsubscribe();

    
    this.projectContext.clearProject();
  }
}
