import { Component, ElementRef, HostListener, OnDestroy, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnDestroy {
  isLoggedIn = false;
  showMenu = false;
  private sub: Subscription;
  private readonly host = inject(ElementRef<HTMLElement>);

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

  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showMenu) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    const menuEl = this.host.nativeElement.querySelector('.user-menu');
    if (!menuEl || !menuEl.contains(target)) {
      this.showMenu = false;
    }
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
