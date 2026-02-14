import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ManagedUser, UserRole } from '../../core/services/user-management.service';

export type UserFormMode = 'invite' | 'edit-role';

export interface InviteUserFormValue {
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
}

export interface EditRoleFormValue {
  role: UserRole;
}

export type UserFormSubmitValue = InviteUserFormValue | EditRoleFormValue;

@Component({
  selector: 'app-user-form-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-modal.component.html',
  styleUrl: './user-form-modal.component.css',
})
export class UserFormModalComponent implements OnChanges {
  private readonly fb = inject(FormBuilder);

  @Input() mode: UserFormMode = 'invite';
  @Input() loading = false;
  @Input() errorMessage: string | null = null;
  @Input() user: ManagedUser | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<UserFormSubmitValue>();

  form = this.fb.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['DEV' as UserRole, [Validators.required]],
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode']) {
      this.configureFormForMode();
    }

    if (changes['user'] && this.user) {
      this.form.patchValue({
        first_name: this.user.first_name ?? '',
        last_name: this.user.last_name ?? '',
        email: this.user.email ?? '',
        role: this.user.role ?? 'DEV',
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (this.mode === 'edit-role') {
      this.submitted.emit({ role: value.role as UserRole });
      return;
    }

    this.submitted.emit({
      first_name: value.first_name ?? '',
      last_name: value.last_name ?? '',
      email: value.email ?? '',
      role: value.role as UserRole,
    });
  }

  onClose(): void {
    this.close.emit();
  }

  showError(controlName: 'first_name' | 'last_name' | 'email' | 'role', errorCode: string): boolean {
    const control = this.form.controls[controlName];
    return !!(control.touched && control.hasError(errorCode));
  }

  private configureFormForMode(): void {
    if (this.mode === 'edit-role') {
      this.form.controls.first_name.disable({ emitEvent: false });
      this.form.controls.last_name.disable({ emitEvent: false });
      this.form.controls.email.disable({ emitEvent: false });
      return;
    }

    this.form.controls.first_name.enable({ emitEvent: false });
    this.form.controls.last_name.enable({ emitEvent: false });
    this.form.controls.email.enable({ emitEvent: false });
  }
}
