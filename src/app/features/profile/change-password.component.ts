import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProfileService } from '../../core/services/profile.service';

type PasswordField = 'old_password' | 'new_password' | 'confirm_password';
type PasswordValidationMap = Partial<Record<PasswordField, string[]>>;

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangePasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  private successTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<PasswordValidationMap>({});
  readonly showOldPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly expanded = signal(false);

  readonly form = this.fb.nonNullable.group(
    {
      old_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
    },
    { validators: [passwordMatchValidator()] }
  );

  readonly strength = computed(() => {
    const value = this.form.controls.new_password.value;
    if (!value) {
      return { label: 'None', score: 0 };
    }

    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/[0-9]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    if (score <= 2) return { label: 'Weak', score };
    if (score <= 4) return { label: 'Medium', score };
    return { label: 'Strong', score };
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.successTimer) {
        clearTimeout(this.successTimer);
      }
    });
  }

  submit(): void {
    this.clearMessages();
    this.fieldErrors.set({});

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.profileService
      .changePassword({
        old_password: this.form.controls.old_password.value,
        new_password: this.form.controls.new_password.value,
        confirm_password: this.form.controls.confirm_password.value,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.resetFormState();
          this.expanded.set(false);
          this.successMessage.set('Password changed successfully.');
          this.scheduleSuccessClear();
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.handleError(error);
        },
      });
  }

  getFieldError(field: PasswordField): string | null {
    const control = this.form.controls[field];
    if (control.hasError('required')) {
      return 'This field is required.';
    }

    if (field === 'new_password' && control.hasError('minlength')) {
      return 'Password must be at least 8 characters.';
    }

    if (field === 'confirm_password' && this.form.hasError('passwordMismatch') && control.touched) {
      return 'Passwords do not match.';
    }

    const apiErrors = this.fieldErrors()[field];
    return apiErrors && apiErrors.length > 0 ? apiErrors[0] : null;
  }

  getStrengthClass(): string {
    const label = this.strength().label;
    if (label === 'Strong') return 'strong';
    if (label === 'Medium') return 'medium';
    return 'weak';
  }

  toggleOldPassword(): void {
    this.showOldPassword.update((v) => !v);
  }

  toggleNewPassword(): void {
    this.showNewPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  open(): void {
    this.clearMessages();
    this.fieldErrors.set({});
    this.expanded.set(true);
  }

  cancel(): void {
    this.clearMessages();
    this.fieldErrors.set({});
    this.resetFormState();
    this.expanded.set(false);
  }

  private handleError(error: HttpErrorResponse): void {
    if (error.status === 0) {
      this.errorMessage.set('Network error. Please try again.');
      return;
    }

    if (error.error && typeof error.error === 'object') {
      const mapped = this.extractValidationErrors(error.error);
      if (Object.keys(mapped).length > 0) {
        this.fieldErrors.set(mapped);
        this.errorMessage.set('Please fix the highlighted fields.');
        return;
      }

      const detail = (error.error as Record<string, unknown>)['detail'];
      if (typeof detail === 'string' && detail.length > 0) {
        this.errorMessage.set(detail);
        return;
      }
    }

    this.errorMessage.set('Failed to change password.');
  }

  private extractValidationErrors(payload: unknown): PasswordValidationMap {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const source = payload as Record<string, unknown>;
    const keys: PasswordField[] = ['old_password', 'new_password', 'confirm_password'];
    const result: PasswordValidationMap = {};

    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) {
        const messages = value.filter((item): item is string => typeof item === 'string');
        if (messages.length > 0) {
          result[key] = messages;
        }
      } else if (typeof value === 'string' && value.length > 0) {
        result[key] = [value];
      }
    }

    return result;
  }

  private clearMessages(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
  }

  private scheduleSuccessClear(): void {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }
    this.successTimer = setTimeout(() => this.successMessage.set(null), 3500);
  }

  private resetFormState(): void {
    this.form.reset({
      old_password: '',
      new_password: '',
      confirm_password: '',
    });
    this.showOldPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }
}

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const newPassword = control.get('new_password')?.value;
    const confirmPassword = control.get('confirm_password')?.value;
    if (!newPassword || !confirmPassword) {
      return null;
    }
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  };
}
