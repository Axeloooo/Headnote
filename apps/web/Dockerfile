FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Leave unset to call the API same-origin through nginx (/api). Set it to call another origin.
ARG VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine
# Files in /etc/nginx/templates are run through envsubst at start, so the upstream is runtime config.
ENV API_UPSTREAM=http://api:8000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://127.0.0.1/healthz || exit 1
