import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ProjectMember } from '../models/member.model';
import { environment } from '../../../environments/environment';

export interface Project {
  id: number;
  name: string;
  description?: string;
  owner?: number;
  owner_username?: string;
  members?: ProjectMember[];
  is_archived: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectService implements OnDestroy {
  private projects$ = new BehaviorSubject<Project[]>([]);
  private authSub: Subscription;
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {
    //  React to login/logout automatically
    this.authSub = this.auth.authState().subscribe(isAuth => {
      if (isAuth) {
        this.loadProjects().subscribe();
      } else {
        this.clearProjects();
      }
    });
  }


  createProject(payload: {
    name: string;
    description?: string;
    members?: number[];
  }) {
    return this.http.post<Project>(
      `${this.baseUrl}/api/projects/`,
      payload
    ).pipe(tap(() => this.loadProjects().subscribe()));
  }

  updateProject(projectId: number, payload: {
    name?: string;
    description?: string;
    members?: number[];
  }) {
    return this.http.patch<Project>(
      `${this.baseUrl}/api/projects/${projectId}/`,
      payload
    ).pipe(tap(() => this.loadProjects().subscribe()));
  }

  archiveProject(projectId: number) {
    return this.http.post<Project>(
      `${this.baseUrl}/api/projects/${projectId}/archive/`,
      {}
    ).pipe(tap(() => this.loadProjects().subscribe()));
  }

  unarchiveProject(projectId: number) {
    return this.http.post<Project>(
      `${this.baseUrl}/api/projects/${projectId}/unarchive/`,
      {}
    ).pipe(tap(() => this.loadProjects().subscribe()));
  }

  deleteProject(projectId: number) {
    return this.http.delete<void>(
      `${this.baseUrl}/api/projects/${projectId}/`
    ).pipe(tap(() => this.loadProjects().subscribe()));
  }

  getArchivedProjects() {
    return this.http.get<Project[]>(
      `${this.baseUrl}/api/projects/?archived=true`
    );
  }

  loadProjects() {
    return this.http
      .get<Project[]>(`${this.baseUrl}/api/projects/`)
      .pipe(tap(projects => this.projects$.next(projects)));
  }

  getProjects() {
    return this.projects$.asObservable();
  }

  clearProjects() {
    this.projects$.next([]);
  }

  getProject(projectId: number) {
    return this.http.get<Project>(
      `${this.baseUrl}/api/projects/${projectId}/`
    );
  }

  getProjectMembers(projectId: number) {
    return this.http.get<any>(
      `${this.baseUrl}/api/projects/${projectId}/members/`
    ).pipe(
      map(resp => {
        if (Array.isArray(resp)) return resp as ProjectMember[];
        if (resp && Array.isArray(resp.results)) return resp.results as ProjectMember[];
        // single object -> wrap
        return resp ? [resp as ProjectMember] : [];
      })
    );
  }

  getAllMembers() {
    return this.http.get<any>(`${this.baseUrl}/api/users/`).pipe(
      map(resp => {
        if (Array.isArray(resp)) return resp as ProjectMember[];
        if (resp && Array.isArray(resp.results)) return resp.results as ProjectMember[];
        return resp ? [resp as ProjectMember] : [];
      })
    );
  }

  ngOnDestroy() {
    this.authSub.unsubscribe();
  }
}
