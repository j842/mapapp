FROM nginx:alpine

# Copy our custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy our web content
COPY index.html /usr/share/nginx/html/
COPY data/walk_settings.json /usr/share/nginx/html/
COPY data/*.jpg /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"] 