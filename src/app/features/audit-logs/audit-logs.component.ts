import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuditAction, AuditLogItem, AuditService } from '../../core/services/audit.service';
import { AuthService } from '../../core/services/auth.service';

type ChangeEntry = { field: string; oldValue: string; newValue: string };

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auditService = inject(AuditService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isAdmin = signal(this.authService.isAdmin());
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly logs = signal<AuditLogItem[]>([]);
  readonly page = signal(1);
  readonly totalCount = signal(0);
  readonly pageSize = 20;
  readonly selectedLog = signal<AuditLogItem | null>(null);

  readonly actionOptions: { label: string; value: '' | AuditAction }[] = [
    { label: 'All Actions', value: '' },
    { label: 'Create', value: 'CREATE' },
    { label: 'Update', value: 'UPDATE' },
    { label: 'Delete', value: 'DELETE' },
    { label: 'Restore', value: 'RESTORE' },
    { label: 'Login', value: 'LOGIN' },
    { label: 'Login Failed', value: 'LOGIN_FAILED' },
  ];

  readonly filterForm = this.fb.nonNullable.group({
    startDate: [''],
    endDate: [''],
    action: ['' as '' | AuditAction],
    actor: [''],
  });

  readonly pageCount = computed(() => {
    const count = this.totalCount();
    return count > 0 ? Math.ceil(count / this.pageSize) : 1;
  });

  readonly selectedChangeEntries = computed<ChangeEntry[]>(() => {
    const log = this.selectedLog();
    if (!log?.changes || typeof log.changes !== 'object') {
      return [];
    }

    return Object.entries(log.changes).map(([field, value]) => ({
      field,
      oldValue: this.safeValue(value?.old),
      newValue: this.safeValue(value?.new),
    }));
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.selectedLog.set(null);
    });

    if (!this.isAdmin()) {
      return;
    }

    this.filterForm.controls.actor.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.page.set(1);
        this.loadLogs();
      });

    this.filterForm.controls.action.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadLogs();
      });

    this.filterForm.controls.startDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadLogs();
      });

    this.filterForm.controls.endDate.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(1);
        this.loadLogs();
      });

    this.loadLogs();
  }

  loadLogs(): void {
    if (!this.isAdmin()) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const filters = this.filterForm.getRawValue();
    this.auditService
      .getAuditLogs({
        page: this.page(),
        action: filters.action || undefined,
        actor: filters.actor.trim() || undefined,
        start_date: filters.startDate || undefined,
        end_date: filters.endDate || undefined,
      })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.logs.set(response.results);
          this.totalCount.set(response.count);
        },
        error: () => {
          this.logs.set([]);
          this.totalCount.set(0);
          this.errorMessage.set('Failed to load audit logs.');
        },
      });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pageCount() || page === this.page()) {
      return;
    }
    this.page.set(page);
    this.loadLogs();
  }

  getActionClass(action: AuditAction): string {
    switch (action) {
      case 'CREATE':
      case 'RESTORE':
      case 'LOGIN':
        return 'action-good';
      case 'UPDATE':
        return 'action-info';
      case 'DELETE':
      case 'LOGIN_FAILED':
        return 'action-danger';
      default:
        return 'action-muted';
    }
  }

  hasChanges(log: AuditLogItem): boolean {
    return !!log.changes && Object.keys(log.changes).length > 0;
  }

  openChanges(log: AuditLogItem): void {
    this.selectedLog.set(log);
  }

  closeChanges(): void {
    this.selectedLog.set(null);
  }

  private safeValue(value: unknown): string {
    if (value === null) {
      return 'null';
    }
    if (value === undefined) {
      return '-';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return '[Unserializable]';
    }
  }
}
