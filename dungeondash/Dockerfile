# Use Node.js Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install a simple HTTP server for serving static files
RUN npm install -g serve

# Create a startup script that runs both services
RUN echo '#!/bin/sh' > start.sh && \
    echo 'echo "Starting D&D Dashboard with WebSocket server..."' >> start.sh && \
    echo 'node server.js &' >> start.sh && \
    echo 'serve -s dist -l 5173 &' >> start.sh && \
    echo 'wait' >> start.sh && \
    chmod +x start.sh

# Expose both ports
EXPOSE 5173 3001

# Start both services
CMD ["./start.sh"]