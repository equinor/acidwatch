FROM node:latest as build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

# Install TypeScript and Vite globally
RUN npm install -g typescript vite
COPY . .
RUN npm install --save @types/react-plotly.js
RUN npm run build
FROM docker.io/nginxinc/nginx-unprivileged:alpine as production-stage

COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf

USER 1001
EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]