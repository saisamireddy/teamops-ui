import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Project {
  id: number;
  name: string;
  is_archived: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private projects$ = new BehaviorSubject<Project[]>([]);

  constructor(private http: HttpClient) {}

  loadProjects(): Observable<Project[]> {
    return this.http.get<Project[]>('http://127.0.0.1:8000/api/projects/')
      .pipe(
        tap(projects => this.projects$.next(projects))
      );
  }

  getProjects(): Observable<Project[]> {
    return this.projects$.asObservable();
  }

  clearProjects() {
    this.projects$.next([]);
  }
}
