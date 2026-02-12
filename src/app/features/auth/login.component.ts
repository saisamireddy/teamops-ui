import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  showPassword = signal(false);
  rememberMe = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private projectService: ProjectService
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });

    if (this.route.snapshot.queryParamMap.get('registered') === '1') {
      this.success.set('Registration successful. Please sign in.');
    }
  }

  login(): void {
    if (this.form.invalid) return;

    this.error.set(null);
    this.success.set(null);
    this.loading.set(true);

    const { username, password, rememberMe } = this.form.value;

    if (rememberMe) {
      localStorage.setItem('remembered_username', username);
    } else {
      localStorage.removeItem('remembered_username');
    }

    this.auth.login(username, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.projectService.resolveLandingRoute().subscribe((target) => {
          this.router.navigate(target);
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail || 'Invalid username or password');
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  get isSubmitDisabled(): boolean {
    return this.form.invalid || this.loading();
  }
}
