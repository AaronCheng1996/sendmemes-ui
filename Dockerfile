# Build the Vue 3 admin dashboard and serve the static bundle with nginx.

# Step 1: build (glibc base — reliable prebuilt binaries for Vite/rolldown/lightningcss)
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Step 2: serve
FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
