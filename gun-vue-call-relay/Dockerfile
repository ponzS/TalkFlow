FROM registry.lazycat.cloud/library/node:18-alpine

WORKDIR /app

COPY package.json .
COPY server.js .
COPY start.js .
COPY public/ public/

ENV npm_config_registry=https://registry.npmmirror.com
RUN apk add --no-cache curl && npm install

EXPOSE 8765

CMD ["node", "start.js"]
