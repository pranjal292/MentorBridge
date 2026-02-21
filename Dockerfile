# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup the backend
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Copy backend source
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=7860
ENV DATA_DIR=/app/backend/data

# Ensure data directory exists for SQLite
RUN mkdir -p /app/backend/data

EXPOSE 7860

WORKDIR /app/backend
CMD ["sh", "-c", "node seed.js && node server.js"]
