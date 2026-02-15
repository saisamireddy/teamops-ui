import { Injectable } from '@angular/core';
import { Injector } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private injector: Injector) {}

  intercept(
    req: HttpRequest<unknown>,
    next: HttpHandler
  ): Observable<HttpEvent<unknown>> {

    if (!this.isApiRequest(req.url)) {
      return next.handle(req);
    }

    const auth = this.injector.get(AuthService);
    const token = auth.getToken();

    if (!token) {
      return next.handle(req);
    }

    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    return next.handle(authReq);
  }

  private isApiRequest(url: string): boolean {
    // Same-origin API calls
    if (url.startsWith('/api/')) {
      return true;
    }

    const configuredBase = environment.apiBaseUrl?.trim();
    if (!configuredBase) {
      return false;
    }

    return url.startsWith(configuredBase);
  }
}
