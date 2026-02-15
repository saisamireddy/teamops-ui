import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService, InvitePreview } from '../../core/services/auth.service';

const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirm_password')?.value;
  return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
};

@Component({
  selector: 'app-accept-invite',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './accept-invite.component.html',
  styleUrl: './accept-invite.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptInviteComponent {
  form: FormGroup;
  loading = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  invite = signal<InvitePreview | null>(null);
  token = signal('');

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly auth: AuthService
  ) {
    this.form = this.fb.group(
      {
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', [Validators.required]],
      },
      { validators: passwordMatchValidator }
    );

    const token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
    this.token.set(token);
    if (!token) {
      this.error.set('Invitation token is missing from the link.');
      return;
    }
    this.loadInvite(token);
  }

  acceptInvite(): void {
    if (!this.token()) {
      this.error.set('Invitation token is missing.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const password = this.form.get('password')?.value ?? '';
    const confirm_password = this.form.get('confirm_password')?.value ?? '';

    this.error.set(null);
    this.success.set(null);
    this.submitting.set(true);

    this.auth.acceptInvite({ token: this.token(), password, confirm_password }).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.success.set(response.detail || 'Invitation accepted successfully.');
        setTimeout(() => {
          this.router.navigate(['/login'], { queryParams: { invited: '1' } });
        }, 900);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(this.extractApiError(err, 'Failed to accept invitation.'));
      },
    });
  }

  private loadInvite(token: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.auth.getInvitePreview(token).subscribe({
      next: (invite) => {
        this.invite.set(invite);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(this.extractApiError(err, 'Invitation is invalid or expired.'));
      },
    });
  }

  private extractApiError(error: unknown, fallback: string): string {
    const typedError = error as { error?: { detail?: string; [key: string]: unknown } | string };
    const payload = typedError?.error;
    if (typeof payload === 'string') return payload;
    if (typeof payload?.detail === 'string') return payload.detail;
    if (payload && typeof payload === 'object') {
      const firstMessage = Object.values(payload)
        .map((value) => (Array.isArray(value) ? value.join(', ') : String(value)))
        .find((value) => value.length > 0);
      if (firstMessage) return firstMessage;
    }
    return fallback;
  }
}
