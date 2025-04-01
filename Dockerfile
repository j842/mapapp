
#-------------------------------------------

FROM node:18-alpine AS node-deps

# Copy only package.json first to leverage Docker cache for dependencies
WORKDIR /app
COPY package.json ./
RUN npm install

#-------------------------------------------

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
COPY --from=node-deps /app/node_modules ./node_modules
COPY --from=node-deps /app/package.json ./package.json
COPY server.js ./

# Create data directory structure (will be mounted in production)
RUN mkdir -p /data && chown -R nginx:nginx /data && ln -s /data /app/data

# Copy and set up entrypoint script
COPY --chmod=755 docker-entrypoint.sh /docker-entrypoint.sh

# Expose ports
EXPOSE 80

# Use our entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"] 
