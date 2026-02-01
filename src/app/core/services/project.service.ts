import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Project {
  id: number;
  name: string;
  is_archived: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectService implements OnDestroy {
  private projects$ = new BehaviorSubject<Project[]>([]);
  private authSub: Subscription;

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

  loadProjects() {
    return this.http
      .get<Project[]>('http://127.0.0.1:8000/api/projects/')
      .pipe(tap(projects => this.projects$.next(projects)));
  }

  getProjects() {
    return this.projects$.asObservable();
  }

  clearProjects() {
    this.projects$.next([]);
  }

  ngOnDestroy() {
    this.authSub.unsubscribe();
  }
}
