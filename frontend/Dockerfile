FROM docker.io/library/node:22-bookworm-slim as builder

WORKDIR /app

COPY package*.json ./
COPY . .

RUN npm install
RUN npm install --save @types/plotly.js-basic-dist
RUN npm run build

FROM docker.io/nginxinc/nginx-unprivileged:alpine
WORKDIR /app
COPY --from=builder /app/dist ./www
COPY nginx-conf/nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-conf/injectEnvVars.sh ./server/injectEnvVars.sh
COPY src/inject-env-template.js ./www/inject-env-template.js

USER 0
RUN chown nginx:nginx -R ./www \
    && chown nginx:nginx ./server/injectEnvVars.sh \
    && dos2unix ./server/injectEnvVars.sh \
    && chmod +x ./server/injectEnvVars.sh

USER 101

CMD ./server/injectEnvVars.sh; nginx -g "daemon off;"

EXPOSE 3000
