import { Routes } from '@angular/router';
import { TaskListComponent } from './features/tasks/task-list/task-list.component';

export const routes: Routes = [
    {
    path: 'projects/:projectId/tasks',
    component: TaskListComponent
  },
  {
    path: '',
    redirectTo: 'projects/1/tasks', // TEMP default
    pathMatch: 'full'
  }
];
