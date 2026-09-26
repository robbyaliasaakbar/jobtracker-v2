# backend-api/Dockerfile — multi-stage (PRD wajib #6)
# Target `runner` dipakai oleh infra/docker-compose.stack.yml.

FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/src ./src
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/knexfile.js ./knexfile.js
EXPOSE 7012
USER node
CMD ["node", "src/server.js"]
