import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { LandingGuard } from './core/guards/landing.guard';
import { RedirectPlaceholderComponent } from './core/components/redirect-placeholder.component';
import { LoginComponent } from './features/auth/login.component';
import { RegisterComponent } from './features/auth/register/register.component';
import { TaskListComponent } from './features/tasks/task-list/task-list.component';
import { CreateProjectComponent } from './features/projects/create-project/create-project.component';
import { EditProjectComponent } from './features/projects/edit-project/edit-project.component';
import { NoProjectsComponent } from './features/projects/no-projects.component';
import { MainLayoutComponent } from './layout/main-layout.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'register',
    component: RegisterComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [LandingGuard],
    component: RedirectPlaceholderComponent,
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      {
        path: 'projects/:projectId/tasks',
        component: TaskListComponent,
      },
      {
        path: 'projects/create',
        component: CreateProjectComponent,
      },
      {
        path: 'projects/edit/:id',
        component: EditProjectComponent,
      },
      {
        path: 'no-projects',
        component: NoProjectsComponent,
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
