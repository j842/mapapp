FROM node:18-alpine AS thumbnail-service

# Copy package.json and www directory for Node.js
COPY package.json /app/
COPY www/thumbnail-service.js /app/www/

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

# Copy package.json and install dependencies
COPY package.json /app/
COPY www/thumbnail-service.js /app/www/
WORKDIR /app
RUN npm install

# Copy data files
COPY data/ /data/

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80 (Nginx only)
EXPOSE 80

# Use our entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"] 