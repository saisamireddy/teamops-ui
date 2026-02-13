import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ProfileService, UserProfile } from '../../core/services/profile.service';

type ProfileField = 'email' | 'first_name' | 'last_name' | 'bio' | 'avatar';
type ValidationMap = Partial<Record<ProfileField, string[]>>;

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly apiBaseUrl = environment.apiBaseUrl;
  private readonly fb = inject(FormBuilder);
  private readonly profileService = inject(ProfileService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private successTimer: ReturnType<typeof setTimeout> | null = null;
  private previewObjectUrl: string | null = null;
  private originalEditable: Record<'email' | 'first_name' | 'last_name' | 'bio', string> = {
    email: '',
    first_name: '',
    last_name: '',
    bio: '',
  };

  readonly loadingProfile = signal(true);
  readonly savingProfile = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly errorMessage = signal<string | null>(null);
  readonly fieldErrors = signal<ValidationMap>({});
  readonly selectedAvatarFile = signal<File | null>(null);
  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly currentAvatarUrl = signal<string | null>(null);
  readonly avatarError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: [{ value: '', disabled: true }],
    email: ['', [Validators.required, Validators.email]],
    first_name: ['', [Validators.maxLength(150)]],
    last_name: ['', [Validators.maxLength(150)]],
    bio: ['', [Validators.maxLength(500)]],
    role: [{ value: '', disabled: true }],
  });

  readonly initials = computed(() => {
    const first = this.form.controls.first_name.value.trim();
    const last = this.form.controls.last_name.value.trim();
    if (first || last) {
      return `${first.charAt(0)}${last.charAt(0)}`.trim().toUpperCase();
    }

    const username = this.form.controls.username.value.trim();
    return username.slice(0, 2).toUpperCase() || 'AC';
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.successTimer) {
        clearTimeout(this.successTimer);
      }
      if (this.previewObjectUrl) {
        URL.revokeObjectURL(this.previewObjectUrl);
      }
    });
    this.loadProfile();
  }

  loadProfile(): void {
    this.loadingProfile.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.fieldErrors.set({});

    this.profileService
      .getProfile()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.patchProfileForm(profile);
          this.loadingProfile.set(false);
        },
        error: () => {
          this.loadingProfile.set(false);
          this.errorMessage.set('Failed to load your profile. Please try again.');
        },
      });
  }

  saveProfile(): void {
    this.clearServerErrors();
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.avatarError.set(null);

    if (this.form.controls.email.invalid || this.form.controls.bio.invalid) {
      this.form.controls.email.markAsTouched();
      this.form.controls.bio.markAsTouched();
      return;
    }

    const formData = this.buildFormData();
    if (!formData) {
      this.successMessage.set('No changes to save.');
      this.scheduleSuccessClear();
      return;
    }

    this.savingProfile.set(true);

    this.profileService
      .updateProfile(formData)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (profile) => {
          this.patchProfileForm(profile);
          this.savingProfile.set(false);
          this.successMessage.set('Profile updated successfully.');
          this.scheduleSuccessClear();
        },
        error: (error: HttpErrorResponse) => {
          this.savingProfile.set(false);
          this.handleUpdateError(error);
        },
      });
  }

  closeProfile(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['']);
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;

    this.clearAvatarValidation();
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.selectedAvatarFile.set(null);
      this.clearAvatarPreviewObjectUrl();
      this.avatarPreviewUrl.set(null);
      this.avatarError.set('Only image files are allowed.');
      if (input) input.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.selectedAvatarFile.set(null);
      this.clearAvatarPreviewObjectUrl();
      this.avatarPreviewUrl.set(null);
      this.avatarError.set('Avatar must be 5MB or smaller.');
      if (input) input.value = '';
      return;
    }

    this.selectedAvatarFile.set(file);
    this.setAvatarPreview(file);
  }

  getRoleClass(role: string): string {
    const normalized = role.toUpperCase();
    if (normalized === 'ADMIN') return 'role-admin';
    if (normalized === 'PM') return 'role-pm';
    return 'role-dev';
  }

  getFieldError(field: ProfileField): string | null {
    if (field === 'avatar') {
      const apiErrors = this.fieldErrors().avatar;
      if (apiErrors && apiErrors.length > 0) {
        return apiErrors[0];
      }
      return this.avatarError();
    }

    const control = this.form.controls[field];
    if (control.hasError('required')) {
      return 'This field is required.';
    }
    if (control.hasError('email')) {
      return 'Enter a valid email address.';
    }
    if (control.hasError('maxlength')) {
      return 'Maximum length exceeded.';
    }

    const apiErrors = this.fieldErrors()[field];
    return apiErrors && apiErrors.length > 0 ? apiErrors[0] : null;
  }

  private patchProfileForm(profile: UserProfile): void {
    this.form.patchValue({
      username: profile.username ?? '',
      email: profile.email ?? '',
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      bio: profile.bio ?? '',
      role: profile.role ?? '',
    });
    this.currentAvatarUrl.set(this.resolveAvatarUrl(profile.avatar ?? profile.avatar_url ?? null));
    this.originalEditable = {
      email: (profile.email ?? '').trim(),
      first_name: (profile.first_name ?? '').trim(),
      last_name: (profile.last_name ?? '').trim(),
      bio: (profile.bio ?? '').trim(),
    };
    this.selectedAvatarFile.set(null);
    this.clearAvatarPreviewObjectUrl();
    this.avatarPreviewUrl.set(null);
  }

  private handleUpdateError(error: HttpErrorResponse): void {
    if (error.status === 0) {
      this.errorMessage.set('Network error. Please check your connection and try again.');
      return;
    }

    if (error.status === 400 && error.error && typeof error.error === 'object') {
      const validation = this.extractValidationErrors(error.error);
      if (Object.keys(validation).length > 0) {
        this.fieldErrors.set(validation);
        this.errorMessage.set('Please fix the highlighted fields and try again.');
        return;
      }
    }

    this.errorMessage.set('Unable to update profile right now. Please try again.');
  }

  private extractValidationErrors(payload: unknown): ValidationMap {
    if (!payload || typeof payload !== 'object') {
      return {};
    }

    const candidate = payload as Record<string, unknown>;
    const keys: ProfileField[] = ['email', 'first_name', 'last_name', 'bio', 'avatar'];
    const errors: ValidationMap = {};

    for (const key of keys) {
      const value = candidate[key];
      if (Array.isArray(value)) {
        const messages = value.filter((item): item is string => typeof item === 'string');
        if (messages.length > 0) {
          errors[key] = messages;
        }
      } else if (typeof value === 'string' && value.length > 0) {
        errors[key] = [value];
      }
    }

    return errors;
  }

  private clearServerErrors(): void {
    this.fieldErrors.set({});
  }

  private scheduleSuccessClear(): void {
    if (this.successTimer) {
      clearTimeout(this.successTimer);
    }

    this.successTimer = setTimeout(() => {
      this.successMessage.set(null);
    }, 3500);
  }

  private buildFormData(): FormData | null {
    const formData = new FormData();
    let hasChanges = false;

    const nextValues: Record<'email' | 'first_name' | 'last_name' | 'bio', string> = {
      email: this.form.controls.email.value.trim(),
      first_name: this.form.controls.first_name.value.trim(),
      last_name: this.form.controls.last_name.value.trim(),
      bio: this.form.controls.bio.value.trim(),
    };

    (Object.keys(nextValues) as Array<keyof typeof nextValues>).forEach((key) => {
      if (nextValues[key] !== this.originalEditable[key]) {
        formData.append(key, nextValues[key]);
        hasChanges = true;
      }
    });

    const avatar = this.selectedAvatarFile();
    if (avatar) {
      formData.append('avatar', avatar);
      hasChanges = true;
    }

    return hasChanges ? formData : null;
  }

  private setAvatarPreview(file: File): void {
    this.clearAvatarPreviewObjectUrl();
    this.previewObjectUrl = URL.createObjectURL(file);
    this.avatarPreviewUrl.set(this.previewObjectUrl);
  }

  private clearAvatarPreviewObjectUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  private clearAvatarValidation(): void {
    this.avatarError.set(null);
    const errors = { ...this.fieldErrors() };
    delete errors.avatar;
    this.fieldErrors.set(errors);
  }

  private resolveAvatarUrl(url: string | null): string | null {
    if (!url) {
      return null;
    }

    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url;
    }

    if (url.startsWith('/')) {
      return `${this.apiBaseUrl}${url}`;
    }

    return `${this.apiBaseUrl}/${url}`;
  }
}
