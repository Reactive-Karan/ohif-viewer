# Stage 1: Build the application
FROM node:18-alpine as builder
RUN apk add --no-cache build-base python3

WORKDIR /usr/src/app

# Copy necessary files
COPY package.json yarn.lock preinstall.js ./
COPY extensions/ ./extensions/
COPY modes/ ./modes/
COPY platform/ ./platform/

# Install dependencies and build
RUN yarn install --frozen-lockfile --verbose
COPY . .
RUN yarn run build

# Stage 2: Production image using Nginx
FROM nginxinc/nginx-unprivileged:1.25-alpine as final

ENV PORT=80

# Remove the default Nginx configuration and replace it with your custom one
RUN rm /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx .docker/Viewer-v3.x /usr/src
RUN chmod 777 /usr/src/entrypoint.sh

# Copy built app from the previous stage
COPY --from=builder /usr/src/app/platform/app/dist /usr/share/nginx/html

# Adjust permissions for config file
USER root
RUN chmod 666 /usr/share/nginx/html/app-config.js
USER nginx

# Entrypoint and start command
ENTRYPOINT ["/usr/src/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
