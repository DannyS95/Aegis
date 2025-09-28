FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build (for production images)
RUN npm run build

# Runtime
EXPOSE 3000
CMD ["node", "dist/main.js"]
