import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { FormsModule } from '@angular/forms'; 
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class LoginComponent {
  username = '';
  password = '';
  loading = false;
  error: string | null = null;

  constructor(
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

login() {
  this.error = null;
  this.loading = true;

  this.auth.login(this.username, this.password).subscribe({
    next: () => {
      this.loading = false;
      this.router.navigate(['/projects', 1, 'tasks']);
    },
    error: (err) => {
      this.loading = false;
      this.error =
        err?.error?.detail ||
        'Invalid username or password';

      this.cdr.detectChanges();
    },
  });
}

}
