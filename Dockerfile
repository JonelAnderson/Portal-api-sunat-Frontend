# syntax=docker/dockerfile:1
# Portal de clientes API SUNAT (frontend): compilación de producción de Angular servida por nginx. nginx reenvía la API por el mismo origen (sin CORS).
# Contexto de build: la raíz de este repositorio. Se despliega en Coolify con docker-compose.coolify.yml.
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
# --legacy-peer-deps: algunos paquetes todavía declaran Angular 21 como par (mismo modo que en desarrollo).
RUN npm ci --legacy-peer-deps --no-audit --no-fund
COPY . ./
RUN npx ng build --configuration production

FROM nginx:1.27-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /src/dist/ /usr/share/nginx/html/
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
