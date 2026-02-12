import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ProjectService } from '../services/project.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate, CanActivateChild {

  constructor(
    private auth: AuthService,
    private router: Router,
    private projects: ProjectService
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<UrlTree> {
    const isAuthenticated = this.auth.isAuthenticated();
    const isAuthPage =
      state.url.startsWith('/login') || state.url.startsWith('/register');

    if (isAuthenticated && isAuthPage) {
      return this.projects.resolveLandingRoute().pipe(
        map((target) => this.router.createUrlTree(target))
      );
    }

    if (!isAuthenticated && isAuthPage) {
      return true;
    }

    if (isAuthenticated) {
      return true;
    }

    return this.router.createUrlTree(['/login']);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<UrlTree> {
    return this.canActivate(route, state);
  }
}
