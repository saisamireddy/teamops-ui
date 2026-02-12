import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-no-projects',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './no-projects.component.html',
  styleUrl: './no-projects.component.css',
})
export class NoProjectsComponent {
  readonly role: 'ADMIN' | 'PM' | 'DEV' | null;
  readonly canCreateProject: boolean;

  constructor(private auth: AuthService) {
    this.role = this.auth.getUserRole();
    this.canCreateProject = this.auth.canCreateProjects();
  }
}
