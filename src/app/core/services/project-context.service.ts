import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ProjectContextService {
  private projectId$ = new BehaviorSubject<number | null>(null);

  setProject(projectId: number) {
    this.projectId$.next(projectId);
  }

  clearProject() {
    this.projectId$.next(null);
  }

  getProject(): Observable<number | null> {
    return this.projectId$.asObservable();
  }

  getCurrentProject(): number | null {
    return this.projectId$.value;
  }
}

