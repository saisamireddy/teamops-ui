import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { HeaderComponent } from './layout/header/header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, NavbarComponent, HeaderComponent],
  template: `
    @if (isAuthenticated()) {
      <app-header></app-header>
      <app-navbar></app-navbar>
    }

    <router-outlet></router-outlet>
  `,
})
export class App {
  constructor(private auth: AuthService) {}

  isAuthenticated(): boolean {
    return this.auth.isAuthenticated();
  }
}
