FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

RUN printf '%s\n' \
  'server {' \
  '  listen 80;' \
  '  server_name _;' \
  '  root /usr/share/nginx/html;' \
  '  index index.html;' \
  '' \
  '  location /api/ {' \
  '    default_type application/json;' \
  '    return 404 '\''{"error":{"code":"api_unavailable","message":"Static demo container does not run the API server. Use compose.api.yaml."}}'\'';' \
  '  }' \
  '' \
  '  location /assets/ {' \
  '    try_files $uri =404;' \
  '  }' \
  '' \
  '  location ~* \.(?:js|mjs|css|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|otf|json|pdf|txt|map)$ {' \
  '    try_files $uri =404;' \
  '  }' \
  '' \
  '  location / {' \
  '    try_files $uri /index.html;' \
  '  }' \
  '}' > /etc/nginx/conf.d/default.conf

COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
