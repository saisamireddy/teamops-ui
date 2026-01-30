import { Component, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnDestroy {
  isLoggedIn = false;
  private sub: Subscription;

  constructor(
    private auth: AuthService,
    private router: Router
  ) {
    this.sub = this.auth.authState().subscribe(
      state => (this.isLoggedIn = state)
    );
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
