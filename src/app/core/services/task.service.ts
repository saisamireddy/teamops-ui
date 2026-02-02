import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Task } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  /**
   * READ — baseline load (REQUIRED for realtime correctness)
   */
  getTasks(projectId: number): Observable<Task[]> {
    return this.http.get<Task[]>(
      `${this.baseUrl}/api/projects/${projectId}/tasks/`
    );
  }

  /**
   * CREATE — optimistic UI allowed, WS confirms
   */
  createTask(projectId: number, payload: {
    title: string;
    status?: string;
    priority?: string;
    assigned_to?: number | null;
  }): Observable<Task> {
    return this.http.post<Task>(
      `${this.baseUrl}/api/projects/${projectId}/tasks/`,
      payload
    );
  }

  /**
   * UPDATE — REST is source of truth, WS broadcasts update
   */
  updateTask(taskId: number, payload: Partial<{
    title: string;
    status: string;
    priority: string;
    assigned_to: number | null;
  }>): Observable<Task> {
    return this.http.patch<Task>(
      `${this.baseUrl}/api/tasks/${taskId}/`,
      payload
    );
  }

  /**
   * DELETE — soft delete
   * UI removes task, WS enforces consistency
   */
  deleteTask(taskId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/api/tasks/${taskId}/`
    );
  }

  /**
   * RESTORE — explicit semantic action
   */
  restoreTask(taskId: number): Observable<Task> {
    return this.http.post<Task>(
      `${this.baseUrl}/api/tasks/${taskId}/restore/`,
      {}
    );
  }
}
