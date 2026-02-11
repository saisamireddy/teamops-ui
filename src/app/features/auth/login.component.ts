import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService } from '../../core/services/project.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule],
})
export class LoginComponent {
  form: FormGroup;
  loading = signal(false);
  error = signal<string | null>(null);
  showPassword = signal(false);
  rememberMe = signal(false);

  constructor(
    private auth: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private projectService: ProjectService
  ) {
    this.form = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false],
    });
  }

  login(): void {
    if (this.form.invalid) return;

    this.error.set(null);
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

        // Load projects and decide where to redirect (Cases A/B/C)
        this.projectService.loadProjects().subscribe({
          next: (projects) => {
            if (!projects || projects.length === 0) {
              // Case A: no projects — go to create project page
              this.router.navigate(['/projects', 'create']);
              return;
            }

            const saved = localStorage.getItem('last_project_id');
            const savedId = saved ? Number(saved) : null;

            if (savedId && projects.some(p => p.id === savedId)) {
              // Case B: saved project exists
              this.router.navigate(['/projects', savedId, 'tasks']);
              return;
            }

            // Case C: fallback to first available project
            const firstId = projects[0].id;
            localStorage.setItem('last_project_id', String(firstId));
            this.router.navigate(['/projects', firstId, 'tasks']);
          },
          error: () => {
            // If loading projects fails, fallback to login's previous behavior
            const saved = localStorage.getItem('last_project_id');
            this.router.navigate(saved ? ['/projects', saved, 'tasks'] : ['/projects', 1, 'tasks']);
          }
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
