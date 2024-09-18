# Stage 1: Build the frontend
FROM node:22 AS frontend-build

WORKDIR /frontend

# Copy frontend package.json and install dependencies
COPY ./willm-frontend/package*.json ./
RUN npm install

# Copy the rest of the frontend source code and build
COPY ./willm-frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM node:22 AS backend-build

WORKDIR /backend

# Copy backend package.json and install dependencies
COPY ./willm-backend/package*.json ./
RUN npm install

# Copy the rest of the backend source code
COPY ./willm-backend/ ./

# Build the backend (if necessary, e.g., if using TypeScript)
RUN npm run build

# Stage 3: Final image
FROM node:22-alpine AS final

WORKDIR /usr/src/app

# Copy backend build and node_modules
COPY --from=backend-build /backend /usr/src/app

# Copy frontend build to backend's public directory
COPY --from=frontend-build /frontend/dist /usr/src/app/public

# Expose the application port
EXPOSE 3101

# Start the application
CMD ["npm", "run", "start"]