FROM node:20-alpine as builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Set environment to production
ENV NODE_ENV=production
ENV NEXT_PUBLIC_FHIR_SERVER=${NEXT_PUBLIC_FHIR_SERVER:-https://hapi.fhir.org/baseR4}

# Copy package files and install production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server/db.ts ./server/db.ts
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts

# Create a dedicated user for running the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["node", "dist/server/index.js"]