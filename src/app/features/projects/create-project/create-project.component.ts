import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectMember } from '../../../core/models/member.model';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-create-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-project.component.html',
  styleUrl: './create-project.component.css',
})
export class CreateProjectComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  name = '';
  description = '';
  selectedMembers: number[] = [];
  availableMembers: ProjectMember[] = [];
  loading = false;
  error: string | null = null;
  showMembersDropdown = false;

  constructor(
    private projectService: ProjectService,
    private router: Router,
    private toast: ToastService
  ) {}

  ngOnInit() {
    // Load all available members for selection
    this.projectService.getAllMembers().subscribe({
      next: (members) => {
        this.availableMembers = members;
      },
      error: () => {
        this.availableMembers = [];
        this.toast.info('Could not load member list. You can still create a project.');
      }
    });
  }

  submit() {
    if (!this.name.trim()) {
      const message = 'Project name required';
      this.error = message;
      this.toast.error(message);
      return;
    }

    this.loading = true;
    this.error = null;

    // Normalize and filter member IDs to numbers
    const validMembers = this.selectedMembers.map(m => Number(m)).filter(m => !Number.isNaN(m));

    this.projectService.createProject({
      name: this.name,
      description: this.description || undefined,
      members: validMembers.length > 0 ? validMembers : undefined
    }).subscribe({
      next: (createdProject) => {
        this.toast.success(`Project "${createdProject.name}" created.`);
        if (this.close.observed) {
          this.close.emit();
          return;
        }

        this.router.navigate(['/projects', createdProject.id, 'tasks']);
      },
      error: (error: unknown) => {
        const message = this.extractApiError(error, 'Failed to create project');
        this.error = message;
        this.toast.error(message);
        this.loading = false;
      }
    });
  }

  toggleMember(memberId: number) {
    const id = Number(memberId);
    if (Number.isNaN(id)) return;
    const index = this.selectedMembers.indexOf(id);
    if (index > -1) {
      this.selectedMembers.splice(index, 1);
    } else {
      this.selectedMembers.push(id);
    }
  }

  isMemberSelected(memberId: number): boolean {
    return this.selectedMembers.includes(Number(memberId));
  }

  cancel() {
    if (this.close.observed) {
      this.close.emit();
      return;
    }

    this.router.navigate(['/no-projects']);
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
