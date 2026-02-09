import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-project.component.html',
})
export class CreateProjectComponent {

  @Output() close = new EventEmitter<void>();

  name = '';
  loading = false;
  error: string | null = null;

  constructor(private projectService: ProjectService) {}

  submit() {
    if (!this.name.trim()) {
      this.error = 'Project name required';
      return;
    }

    this.loading = true;
    this.error = null;

    this.projectService.createProject({
      name: this.name
    }).subscribe({
      next: () => {
        this.close.emit();
      },
      error: () => {
        this.error = 'Failed to create project';
        this.loading = false;
      }
    });
  }

  cancel() {
    this.close.emit();
  }
}
