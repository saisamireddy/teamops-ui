import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { OnChanges, SimpleChanges } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-edit-task',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-task.component.html',
  styleUrl: './edit-task.component.css',
})
export class EditTaskComponent implements OnChanges{
  @Input() task!: Task;
  @Input() projectId!: number;
  @Input() members: { id: number; username: string }[] = [];

  @Output() close = new EventEmitter<void>();

  loading = false;
  error: string | null = null;

  form: Partial<Task> = {};

  ngOnChanges(changes: SimpleChanges) {
    if (changes['task'] && this.task) {
      this.form = {
        title: this.task.title,
        description: this.task.description || '',
        status: this.task.status,
        priority: this.task.priority,
        assigned_to: this.task.assigned_to?? null,
      };
    }

  }

  constructor(
    private taskService: TaskService,
    private toast: ToastService
  ) {}

  submit() {
    if (!this.task?.id) return;

    this.loading = true;
    this.error = null;

    this.taskService.updateTask(this.task.id, this.form)
      .subscribe({
        next: () => {
          this.toast.success('Task updated successfully.');
          this.close.emit(); // WS will refresh UI
        },
        error: err => {
          const message = this.extractApiError(err, 'Update failed');
          this.error = message;
          this.toast.error(message);
          this.loading = false;
        }
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
