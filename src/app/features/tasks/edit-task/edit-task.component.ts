import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../../core/services/task.service';
import { Task } from '../../../core/models/task.model';
import { OnChanges, SimpleChanges } from '@angular/core';

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

  constructor(private taskService: TaskService) {}

  submit() {
    if (!this.task?.id) return;

    this.loading = true;
    this.error = null;

    this.taskService.updateTask(this.task.id, this.form)
      .subscribe({
        next: () => {
          this.close.emit(); // WS will refresh UI
        },
        error: err => {
          this.error = err?.error?.detail || 'Update failed';
          this.loading = false;
        }
      });
  }

  cancel() {
    this.close.emit();
  }
}
