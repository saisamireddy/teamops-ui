import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ProjectService, Project } from '../../core/services/project.service';
import { Observable } from 'rxjs';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent implements OnInit, OnDestroy {
  projects$!: Observable<Project[]>;
  activeProjectId: number | null = null;

  private navSub!: Subscription;

  constructor(
    private router: Router,
    private projects: ProjectService
  ) {}

  ngOnInit() {
    this.projects$ = this.projects.getProjects();

    // ✅ FIX 1: derive project synchronously on first load
    this.activeProjectId = this.extractProjectId(this.router.url);

    // ✅ FIX 2: keep it in sync on navigation
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: NavigationEnd) => {
        this.activeProjectId = this.extractProjectId(e.urlAfterRedirects);
      });
  }

  private extractProjectId(url: string): number | null {
    const match = url.match(/\/projects\/(\d+)\/tasks/);
    return match ? Number(match[1]) : null;
  }

  switchProject(projectId: number) {
    if (!projectId || projectId === this.activeProjectId) return;
    this.router.navigate(['/projects', projectId, 'tasks']);
  }

  ngOnDestroy() {
    this.navSub.unsubscribe();
  }
}
