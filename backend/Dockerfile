# Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code and compile TypeScript
COPY tsconfig.json ./
COPY src ./src/
RUN npm run prisma:generate
RUN npm run build

# Production Stage
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies only
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
RUN npx prisma generate

# Copy compiled JavaScript and assets
COPY --from=builder /app/dist ./dist

# Create storage directory for PDF certificates
RUN mkdir -p uploads/certificates

EXPOSE 5000

CMD ["node", "dist/server.js"]
