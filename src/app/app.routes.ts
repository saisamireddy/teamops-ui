import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { TaskListComponent } from './features/tasks/task-list/task-list.component';

export const routes: Routes = [
    {
    path: 'login',
    component: LoginComponent,
  },
    {
    path: 'projects/:projectId/tasks',
    component: TaskListComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '',
    redirectTo: 'projects/1/tasks', // TEMP default
    pathMatch: 'full'
  }
];
