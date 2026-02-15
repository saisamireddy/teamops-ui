# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

RUN apk add --no-cache bash gettext

COPY --from=build /app/dist/teamops-ui/browser/ ./
COPY deploy/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/nginx/docker-entrypoint.sh /docker-entrypoint.d/50-generate-nginx-conf.sh

RUN chmod +x /docker-entrypoint.d/50-generate-nginx-conf.sh

ENV BACKEND_UPSTREAM=http://backend:8000

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
