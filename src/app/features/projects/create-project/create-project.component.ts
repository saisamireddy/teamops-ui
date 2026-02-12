import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectMember } from '../../../core/models/member.model';

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
    private auth: AuthService
  ) {}

  ngOnInit() {
    // Load all available members for selection
    this.projectService.getAllMembers().subscribe({
      next: (members) => {
        console.log('CreateProject: getAllMembers response', members);
        this.availableMembers = members;
      },
      error: () => {
        console.warn('CreateProject: getAllMembers failed');
        this.availableMembers = [];
      }
    });
  }

  submit() {
    if (!this.name.trim()) {
      this.error = 'Project name required';
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
      next: () => {
        this.close.emit();
      },
      error: () => {
        this.error = 'Failed to create project';
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
    this.close.emit();
  }
}
