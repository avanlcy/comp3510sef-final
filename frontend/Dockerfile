FROM nginx:alpine

# Copy static frontend files
COPY index.html style.css app.js /usr/share/nginx/html/

# Override default nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
