import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, Project } from '../../../core/services/project.service';
import { ProjectMember } from '../../../core/models/member.model';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-edit-project',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-project.component.html',
  styleUrl: './edit-project.component.css',
})
export class EditProjectComponent implements OnInit, OnChanges {
  @Input() project!: Project;
  @Output() close = new EventEmitter<void>();

  name = '';
  description = '';
  selectedMembers: number[] = [];
  availableMembers: ProjectMember[] = [];
  loading = false;
  error: string | null = null;
  archiveLoading = false;
  archiveError: string | null = null;
  showMembersDropdown = false;

  constructor(private projectService: ProjectService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (this.project) {
      this.name = this.project.name;
      this.description = this.project.description || '';
      this.loadMembers();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['project'] && this.project) {
      this.name = this.project.name;
      this.description = this.project.description || '';
      this.loadMembers();
      
    }
  }

  loadMembers() {
    
    this.projectService.getAllMembers().subscribe({
      next: (members) => {
        
        this.availableMembers = members;
        
        if ((!this.availableMembers || this.availableMembers.length === 0) && this.project?.members) {
          this.availableMembers = this.project.members as ProjectMember[];
          
        }
        
        const raw = (this.project.members || []);
       
        const extracted = raw
          .map(m => {
            if (typeof m === 'number') return m;
            if (typeof m === 'string') return (m as string).trim() !== '' ? Number(m) : NaN;
            if (m && typeof m === 'object') return Number((m as any).id ?? (m as any).user_id ?? (m as any).pk ?? null);
            return NaN;
          })
          .map(n => Number(n))
          .filter(n => !Number.isNaN(n));
        this.selectedMembers = [...extracted];
       
        setTimeout(() => console.log('EditProject: post-tick selectedMembers', this.selectedMembers.slice()), 0);
        this.cdr.markForCheck();
      },
      error: () => {
       
        // Fallback to project members if getAllMembers fails
        if (this.project?.id) {
          this.projectService.getProjectMembers(this.project.id).subscribe({
            next: (members) => {
             
              this.availableMembers = members;
              if ((!this.availableMembers || this.availableMembers.length === 0) && this.project?.members) {
                this.availableMembers = this.project.members as ProjectMember[];
                console.warn('EditProject: fallback populated from project.members', this.availableMembers);
              }
              const rawFb = (this.project.members || []);
             
              const extractedFb = rawFb
                .map(m => {
                  if (typeof m === 'number') return m;
                  if (typeof m === 'string') return (m as string).trim() !== '' ? Number(m) : NaN;
                  if (m && typeof m === 'object') return Number((m as any).id ?? (m as any).user_id ?? (m as any).pk ?? null);
                  return NaN;
                })
                .map(n => Number(n))
                .filter(n => !Number.isNaN(n));
              this.selectedMembers = [...extractedFb];
            
            },
            error: () => {
              this.availableMembers = this.project?.members ? (this.project.members as ProjectMember[]) : [];
              if (this.availableMembers.length > 0) console.warn('EditProject: final fallback using project.members', this.availableMembers);
              const rawFinal = (this.project.members || []);
              const extractedFinal = rawFinal
                .map(m => {
                  if (typeof m === 'number') return m;
                  if (typeof m === 'string') return (m as string).trim() !== '' ? Number(m) : NaN;
                  if (m && typeof m === 'object') return Number((m as any).id ?? (m as any).user_id ?? (m as any).pk ?? null);
                  return NaN;
                })
                .map(n => Number(n))
                .filter(n => !Number.isNaN(n));
              this.selectedMembers = [...extractedFinal];
            }
          });
        }
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
    const validMembers = this.selectedMembers.map(m => Number(m)).filter(m => !Number.isNaN(m));

    this.projectService.updateProject(this.project.id, {
      name: this.name,
      description: this.description || undefined,
      members: validMembers.length > 0 ? validMembers : undefined
    }).subscribe({
      next: () => {
        this.close.emit();
      },
      error: () => {
        this.error = 'Failed to update project';
        this.loading = false;
      }
    });
  }

  archiveProject() {
    if (!confirm('Archive this project? Tasks will not be accessible.')) {
      return;
    }

    this.archiveLoading = true;
    this.archiveError = null;

    this.projectService.archiveProject(this.project.id).subscribe({
      next: () => {
        this.close.emit();
      },
      error: () => {
        this.archiveError = 'Failed to archive project';
        this.archiveLoading = false;
      }
    });
  }
  
  unarchiveProject() {
 
  if (!confirm('Are you sure you want to unarchive this project?')) {
    return;
  }

  this.archiveLoading = true;
  this.archiveError = null;

 
  this.projectService.unarchiveProject(this.project.id).subscribe({
    next: () => {
      this.archiveLoading = false;
      this.close.emit(); 
    
    },
    error: (err) => {
      console.error(err);
      this.archiveError = 'Failed to unarchive project';
      this.archiveLoading = false;
    }
  });
}

  deleteProject() {
    if (!confirm('Delete this project permanently? This action cannot be undone.')) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.projectService.deleteProject(this.project.id).subscribe({
      next: () => {
        this.close.emit();
      },
      error: () => {
        this.error = 'Failed to delete project';
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
