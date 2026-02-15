# Production Checklist

## Build and Deploy
- Run `npm ci`.
- Run `npm run build`.
- Build container: `docker build -t teamops-ui:latest .`.
- Verify health endpoint: `GET /healthz` returns `200`.
- For Kubernetes, update `deploy/k8s/deployment.yaml` image tag before rollout.

## Runtime Configuration
- Set `BACKEND_UPSTREAM` to your backend URL (example: `http://api:8000`).
- Ensure reverse proxy/load balancer serves HTTPS.
- Ensure `/api/*` and `/ws/*` are reachable from the frontend container.

## Security
- Enable HSTS at edge (ingress/CDN).
- Set CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy at edge.
- Keep backend CORS restricted to deployed frontend origin(s).
- Rotate JWT secrets and API credentials before go-live.

## Observability
- Capture frontend access logs from Nginx.
- Track client-side error rates (Sentry or equivalent).
- Add uptime checks for `/healthz` and one authenticated flow.

## Operations
- Keep rollback artifact for previous frontend version.
- Document release version/tag and deployment timestamp.
- Test login, project creation, task create/edit/delete, admin user actions post-deploy.
- Verify WebSocket actions still work behind ingress (`/ws/*` upgrade).
