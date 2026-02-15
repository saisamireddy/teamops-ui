import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-create-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-task.component.html',
  styleUrl: './create-task.component.css',
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

  constructor(
    private taskService: TaskService,
    private toast: ToastService
  ) {}

  submit() {
    if (!this.form.title.trim()) {
      const message = 'Title is required';
      this.error = message;
      this.toast.error(message);
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
      this.toast.success('Task created successfully.');
      this.close.emit();
    },
    error: (err) => {
      const message = this.extractApiError(err, 'Failed to create task');
      this.error = message;
      this.toast.error(message);
      this.loading = false;
    },
  });
  }

  cancel() {
    this.close.emit();
  }

  private extractApiError(error: unknown, fallback: string): string {
    const typedError = error as {
      error?: { detail?: string; [key: string]: unknown } | string;
    };
    const errorPayload = typedError?.error;
    if (typeof errorPayload === 'string') return errorPayload;
    if (typeof errorPayload?.detail === 'string') return errorPayload.detail;

    if (errorPayload && typeof errorPayload === 'object') {
      const firstMessage = Object.values(errorPayload)
        .map((value) => (Array.isArray(value) ? value.join(', ') : String(value)))
        .find((value) => value.length > 0);
      if (firstMessage) return firstMessage;
    }

    return fallback;
  }
}
