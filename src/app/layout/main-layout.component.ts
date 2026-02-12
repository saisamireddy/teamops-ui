import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { HeaderComponent } from './header/header.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, HeaderComponent],
  template: `
    <app-header></app-header>
    <div class="layout-container">
      <app-navbar></app-navbar>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
  `,
  styles: [`
    .layout-container {
      display: flex;
      gap: 0;
      margin-top: 0;
    }

    .main-content {
      flex: 1;
      margin-left: 280px;
      min-height: calc(100vh - 70px);
      background: #f9fafb;
    }

    @media (max-width: 1024px) {
      .main-content {
        margin-left: 240px;
      }
    }

    @media (max-width: 768px) {
      .main-content {
        margin-left: 70px;
      }
    }

    @media (max-width: 640px) {
      .layout-container {
        flex-direction: column;
      }

      .main-content {
        margin-left: 0;
        min-height: auto;
      }
    }
  `],
})
export class MainLayoutComponent {}
