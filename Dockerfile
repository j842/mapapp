FROM nginx:alpine

# Create data directory
RUN mkdir -p /data && chown -R nginx:nginx /data

# Add environment variable substitution tool
RUN apk add --no-cache gettext

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy our web content
COPY index.html /usr/share/nginx/html/

# Copy data files
COPY data/ /data/

# Copy and set up entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Expose port 80
EXPOSE 80

# Use our entrypoint script
ENTRYPOINT ["/docker-entrypoint.sh"] 