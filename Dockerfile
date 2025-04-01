FROM node:18-alpine AS node-deps

# Copy only package.json first to leverage Docker cache for dependencies
WORKDIR /app
COPY package.json ./
RUN npm install

# Build the application in a separate stage
FROM node:18-alpine AS app-builder
WORKDIR /app
COPY --from=node-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server.js ./
COPY www/ ./www/

# Final stage
FROM nginx:alpine

# Add environment variable substitution tool and Node.js
RUN apk add --no-cache gettext nodejs npm

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy our web content
COPY www/ /usr/share/nginx/html/

# Copy node dependencies, package.json and server.js from the builder stage
WORKDIR /app
COPY --from=app-builder /app/node_modules ./node_modules
COPY --from=app-builder /app/package.json ./
COPY --from=app-builder /app/server.js ./

# Create symbolic link to make data visible to the Node.js app
RUN ln -s /data /app/data

# Create data directory structure (will be mounted in production)
RUN mkdir -p /data && chown -R nginx:nginx /data

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose ports
EXPOSE 80

# Use our entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"] 
