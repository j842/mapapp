FROM node:18-alpine AS node-base

# Copy package.json and server files for Node.js
COPY package.json /app/
COPY server.js /app/
COPY www/ /app/www/

# Install dependencies
WORKDIR /app
RUN npm install

# Final stage
FROM nginx:alpine

# Add environment variable substitution tool and Node.js
RUN apk add --no-cache gettext nodejs npm

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy our web content
COPY www/ /usr/share/nginx/html/

# Copy server.js and package.json 
COPY package.json /app/
COPY server.js /app/
WORKDIR /app
RUN npm install

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