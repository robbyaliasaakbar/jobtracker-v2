# frontend/Dockerfile — multi-stage (PRD wajib #6)
# Target `runner` = nginx statis (cadangan kalau mau serve FE dari container).

FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
