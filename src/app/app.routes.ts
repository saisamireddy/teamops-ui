import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login.component';
import { TaskListComponent } from './features/tasks/task-list/task-list.component';
import { CreateProjectComponent } from './features/projects/create-project/create-project.component';

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
    path: 'projects/create',
    component: CreateProjectComponent,
    canActivate: [AuthGuard],
  },
  {
  path: '',
  redirectTo: (() => {
    const saved = localStorage.getItem('last_project_id');
    return saved
      ? `projects/${saved}/tasks`
      : 'login';
  })(),
  pathMatch: 'full'
},
  {
    path: '**',
    redirectTo: 'login'
  }
];
