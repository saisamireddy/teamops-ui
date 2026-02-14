import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ProjectService, Project } from '../../core/services/project.service';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CreateProjectComponent } from '../../features/projects/create-project/create-project.component';
import { EditProjectComponent } from '../../features/projects/edit-project/edit-project.component';
import { ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, CreateProjectComponent, EditProjectComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent implements OnInit, OnDestroy {
  projects$!: Observable<Project[]>;
  activeProjectId: number | null = null;
  hasActiveProjects = true;
  showCreateProjectModal = false;
  showEditProjectModal = false;
  selectedProjectForEdit: Project | null = null;
  showArchivedProjects = false;
  archivedProjects: Project[] = [];
  loadingArchived = false;
  isAdmin = false;

  private navSub!: Subscription;
  private projectsSub!: Subscription;

  constructor(
    private router: Router,
    private projects: ProjectService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.isAdmin = this.auth.isAdmin();
    this.projects$ = this.projects.getProjects();
    this.projectsSub = this.projects$.subscribe((projects) => {
      const activeCount = (projects || []).filter(p => !p.is_archived).length;
      this.hasActiveProjects = activeCount > 0;
      if (!this.hasActiveProjects) {
        this.activeProjectId = null;
      }
      this.cdr.markForCheck();
    });

    // ✅ FIX 1: derive project synchronously on first load
    this.activeProjectId = this.extractProjectId(this.router.url);

    // ✅ FIX 2: keep it in sync on navigation
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.activeProjectId = this.extractProjectId(e.urlAfterRedirects);
      });
  }

  openCreateProjectModal() {
    this.showCreateProjectModal = true;
  }

  closeCreateProjectModal() {
    this.showCreateProjectModal = false;

    // Refresh project list after creation
    this.projects.loadProjects().subscribe();
  }

  openEditProjectModal(project: Project) {
    this.selectedProjectForEdit = project;
    this.showEditProjectModal = true;
  }

  closeEditProjectModal() {
    this.showEditProjectModal = false;
    this.selectedProjectForEdit = null;

    // Refresh project list after edit
    this.projects.loadProjects().subscribe();
  }

  toggleArchivedProjects() {
    if (!this.showArchivedProjects) {
      this.loadingArchived = true;
      this.projects.getArchivedProjects().subscribe({
        next: (archived) => {
          this.archivedProjects = archived;
          this.showArchivedProjects = true;
          this.loadingArchived = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingArchived = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      this.showArchivedProjects = false;
    }
  }

  private extractProjectId(url: string): number | null {
    const match = url.match(/\/projects\/(\d+)\/tasks/);
    return match ? Number(match[1]) : null;
  }

  switchProject(projectId: number) {
    if (!projectId || projectId === this.activeProjectId) return;

    localStorage.setItem('last_project_id', String(projectId));

    this.router.navigate(['/projects', projectId, 'tasks']);
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
    this.projectsSub?.unsubscribe();
  }
}
