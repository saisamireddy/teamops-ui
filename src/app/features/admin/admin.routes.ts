import { Routes } from '@angular/router';
import { AuditLogsComponent } from '../audit-logs/audit-logs.component';
import { UserListComponent } from './user-list.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'users',
    component: UserListComponent,
  },
  {
    path: 'audit-logs',
    component: AuditLogsComponent,
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'users',
  },
];
