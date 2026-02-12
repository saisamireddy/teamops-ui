import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ProjectService } from '../services/project.service';

@Injectable({ providedIn: 'root' })
export class LandingGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private projects: ProjectService,
    private router: Router
  ) {}

  canActivate(): Observable<UrlTree> {
    if (!this.auth.isAuthenticated()) {
      return of(this.router.createUrlTree(['/login']));
    }

    return this.projects.resolveLandingRoute().pipe(
      map((target) => this.router.createUrlTree(target))
    );
  }
}
