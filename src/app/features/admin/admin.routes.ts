import { Routes } from '@angular/router';
import { AuditLogsComponent } from '../audit-logs/audit-logs.component';

export const ADMIN_ROUTES: Routes = [
  {
    path: 'audit-logs',
    component: AuditLogsComponent,
  },
];
