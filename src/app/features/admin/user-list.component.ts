import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  CreateUserPayload,
  ManagedUser,
  UpdateUserPayload,
  UserManagementService,
  UserRole,
} from '../../core/services/user-management.service';
import {
  InviteUserFormValue,
  UserFormModalComponent,
  UserFormSubmitValue,
} from './user-form-modal.component';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, UserFormModalComponent],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListComponent implements OnDestroy {
  readonly users = signal<ManagedUser[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly toastMessage = signal<string | null>(null);

  readonly searchTerm = signal('');
  readonly roleFilter = signal<UserRole | ''>('');
  readonly actionMenuUserId = signal<number | null>(null);

  readonly showInviteModal = signal(false);
  readonly showEditRoleModal = signal(false);
  readonly showResetPasswordModal = signal(false);
  readonly selectedUser = signal<ManagedUser | null>(null);
  readonly resetPasswordValue = signal('');
  readonly modalLoading = signal(false);
  readonly modalErrorMessage = signal<string | null>(null);

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private usersService: UserManagementService) {
    this.loadUsers();
  }

  ngOnDestroy(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }

  get filteredUsers(): ManagedUser[] {
    const role = this.roleFilter();
    const search = this.searchTerm().trim().toLowerCase();
    return this.users().filter((user) => {
      const rolePass = !role || user.role === role;
      const searchPass =
        !search ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search);
      return rolePass && searchPass;
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  onRoleFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as UserRole | '';
    this.roleFilter.set(value);
  }

  toggleActionMenu(userId: number): void {
    this.actionMenuUserId.set(this.actionMenuUserId() === userId ? null : userId);
  }

  closeActionMenu(): void {
    this.actionMenuUserId.set(null);
  }

  openInviteModal(): void {
    this.modalErrorMessage.set(null);
    this.selectedUser.set(null);
    this.showInviteModal.set(true);
  }

  openEditRoleModal(user: ManagedUser): void {
    this.modalErrorMessage.set(null);
    this.selectedUser.set(user);
    this.showEditRoleModal.set(true);
    this.closeActionMenu();
  }

  closeModals(): void {
    this.showInviteModal.set(false);
    this.showEditRoleModal.set(false);
    this.showResetPasswordModal.set(false);
    this.modalLoading.set(false);
    this.modalErrorMessage.set(null);
    this.resetPasswordValue.set('');
    this.selectedUser.set(null);
  }

  submitInvite(value: UserFormSubmitValue): void {
    const payload = value as InviteUserFormValue;
    const invitePayload: CreateUserPayload = {
      first_name: payload.first_name,
      last_name: payload.last_name,
      email: payload.email,
      role: payload.role,
    };

    this.modalLoading.set(true);
    this.modalErrorMessage.set(null);
    this.usersService.createUser(invitePayload).subscribe({
      next: (createdUser) => {
        this.users.set([createdUser, ...this.users()]);
        this.modalLoading.set(false);
        this.closeModals();
        this.showToast(`Invite sent to ${createdUser.email}`);
      },
      error: (error: unknown) => {
        this.modalLoading.set(false);
        this.modalErrorMessage.set(this.extractApiError(error, 'Failed to invite user.'));
      },
    });
  }

  submitEditRole(value: UserFormSubmitValue): void {
    const user = this.selectedUser();
    if (!user) {
      return;
    }

    const payload = value as { role: UserRole };
    const updatePayload: UpdateUserPayload = { role: payload.role };
    this.modalLoading.set(true);
    this.modalErrorMessage.set(null);

    this.usersService.updateUser(user.id, updatePayload).subscribe({
      next: (updatedUser) => {
        this.users.set(this.users().map((item) => (item.id === updatedUser.id ? updatedUser : item)));
        this.modalLoading.set(false);
        this.closeModals();
        this.showToast(`Role updated for ${updatedUser.email}`);
      },
      error: (error: unknown) => {
        this.modalLoading.set(false);
        this.modalErrorMessage.set(this.extractApiError(error, 'Failed to update role.'));
      },
    });
  }

  resetPassword(user: ManagedUser): void {
    this.modalErrorMessage.set(null);
    this.selectedUser.set(user);
    this.resetPasswordValue.set('');
    this.showResetPasswordModal.set(true);
    this.closeActionMenu();
  }

  onResetPasswordInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.resetPasswordValue.set(value);
  }

  submitResetPassword(): void {
    const user = this.selectedUser();
    const password = this.resetPasswordValue();
    if (!user) {
      return;
    }

    if (!password.trim()) {
      this.modalErrorMessage.set('Temporary password is required.');
      return;
    }

    this.modalLoading.set(true);
    this.modalErrorMessage.set(null);

    this.usersService.resetUserPassword(user.id, { password }).subscribe({
      next: () => {
        this.modalLoading.set(false);
        this.closeModals();
        this.showToast(`Password reset for ${user.email}`);
      },
      error: (error: unknown) => {
        this.modalLoading.set(false);
        this.modalErrorMessage.set(this.extractApiError(error, 'Failed to reset password.'));
      },
    });
  }

  toggleStatus(user: ManagedUser): void {
    this.closeActionMenu();
    const previousUsers = this.users();
    const optimisticUsers = previousUsers.map((item) =>
      item.id === user.id ? { ...item, is_active: !item.is_active } : item
    );
    this.users.set(optimisticUsers);

    this.usersService.toggleUserStatus(user.id).subscribe({
      next: (serverUser) => {
        this.users.set(this.users().map((item) => (item.id === serverUser.id ? serverUser : item)));
        this.showToast(serverUser.is_active ? 'User activated.' : 'User suspended.');
      },
      error: (error: unknown) => {
        this.users.set(previousUsers);
        this.errorMessage.set(this.extractApiError(error, 'Failed to update user status.'));
      },
    });
  }

  getRoleBadgeClass(role: UserRole): string {
    if (role === 'ADMIN') return 'role-admin';
    if (role === 'PM') return 'role-manager';
    return 'role-dev';
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.usersService.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.users.set([]);
        this.loading.set(false);
        this.errorMessage.set(this.extractApiError(error, 'Failed to load users.'));
      },
    });
  }

  private showToast(message: string): void {
    this.toastMessage.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => this.toastMessage.set(null), 2800);
  }

  private extractApiError(error: unknown, fallback: string): string {
    const typedError = error as {
      error?: { detail?: string; [key: string]: unknown } | string;
    };
    const errorPayload = typedError?.error;
    if (typeof errorPayload === 'string') return errorPayload;
    if (typeof errorPayload?.detail === 'string') return errorPayload.detail;

    if (errorPayload && typeof errorPayload === 'object') {
      const firstMessage = Object.values(errorPayload)
        .map((value) => (Array.isArray(value) ? value.join(', ') : String(value)))
        .find((value) => value.length > 0);
      if (firstMessage) return firstMessage;
    }

    return fallback;
  }
}
