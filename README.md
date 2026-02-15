# TeamOps UI

Angular frontend for the TeamOps platform.

## Tech Stack
- Angular
- TypeScript
- SCSS
- JWT-based authentication
- WebSockets for real-time updates

## Development

```bash
npm install
npm start
```

Default development API base URL is set in `src/environments/environment.development.ts`.

## Production

`src/environments/environment.ts` uses `apiBaseUrl: ''`, which expects API and WebSocket traffic to be served from the same origin (recommended behind a reverse proxy).

If your API is hosted on a different origin, set `apiBaseUrl` in `src/environments/environment.ts` to that full URL.

Build for production:

```bash
npm run build
```

## Docker Deployment

Build the production image:

```bash
docker build -t teamops-ui:latest .
```

Run locally (frontend on `http://localhost:8080`):

```bash
docker run --rm -p 8080:80 -e BACKEND_UPSTREAM=http://host.docker.internal:8000 teamops-ui:latest
```

Or use Compose:

```bash
docker compose up --build -d
```

`BACKEND_UPSTREAM` should point to your backend base URL reachable from the container (for both `/api/*` and `/ws/*`).

## Kubernetes Deployment

Base manifests are in `deploy/k8s/`:
- `namespace.yaml`
- `deployment.yaml`
- `service.yaml`
- `ingress.yaml`

Before apply:
1. Build and push image:
```bash
docker build -t <registry>/teamops-ui:<tag> .
docker push <registry>/teamops-ui:<tag>
```
2. Update `image` in `deploy/k8s/deployment.yaml`.
3. Update host in `deploy/k8s/ingress.yaml` (`teamops.example.com`).
4. If needed, update `BACKEND_UPSTREAM` in `deploy/k8s/deployment.yaml`.

Apply:
```bash
kubectl apply -f deploy/k8s/namespace.yaml
kubectl apply -f deploy/k8s/deployment.yaml
kubectl apply -f deploy/k8s/service.yaml
kubectl apply -f deploy/k8s/ingress.yaml
```

## Release Checklist

Use `docs/PRODUCTION_CHECKLIST.md` before each production deployment.

## Backend API

This UI consumes the TeamOps backend API:
https://github.com/saisamireddy/teamops
