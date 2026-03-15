# Use Node.js 18 LTS Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Create logs directory and set permissions
RUN mkdir -p logs && \
    chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node healthcheck.js

# Start the application
CMD ["npm", "start"]