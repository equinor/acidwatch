envsubst < /app/www/inject-env-template.js > /app/www/inject-env.js
envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
echo $(cat /app/www/inject-env.js)
echo $(cat /etc/nginx/conf.d/default.conf)
echo $(date) Starting Nginx… env: ${ACIDWATCH_ENVIRONMENT}
