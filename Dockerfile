FROM nginx:alpine

# Create data directory
RUN mkdir -p /data && chown -R nginx:nginx /data

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy our web content
COPY index.html /usr/share/nginx/html/

# Copy data files
COPY data/ /data/

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"] 