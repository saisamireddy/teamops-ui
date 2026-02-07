import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-task.component.html',
})
export class CreateTaskComponent {
  @Input() projectId!: number;
  @Input() members: { id: number; username: string }[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() optimisticCreate = new EventEmitter<any>();

  loading = false;
  error: string | null = null;

  form = {
    title: '',
    description: '',
    status: 'TODO',
    priority: 'MED',
    assigned_to: null as number | null,
  };

  constructor(private taskService: TaskService) {}

  submit() {
    if (!this.form.title.trim()) {
      this.error = 'Title is required';
      return;
    }

    const tempTask = {
      id: Date.now(), // temporary id
      title: this.form.title,
      description: this.form.description,
      status: this.form.status,
      priority: this.form.priority,
      assigned_to: this.form.assigned_to,
      updated_at: new Date().toISOString(),
      optimistic: true
    };

    this.optimisticCreate.emit(tempTask);

    this.loading = true;
    this.error = null;

this.taskService
  .createTask(this.projectId, {
    title: this.form.title,
    description: this.form.description || '',
    status: this.form.status,
    priority: this.form.priority,
    assigned_to: this.form.assigned_to,
  
  })
  .subscribe({
    next: () => {
      // REST succeeded → WS will fan out
      this.close.emit();
    },
    error: (err) => {
      this.error = err?.error?.detail || 'Failed to create task';
      this.loading = false;
    },
  });
  }

  cancel() {
    this.close.emit();
  }
}
