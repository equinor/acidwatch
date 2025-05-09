envsubst < /app/www/inject-env-template.js > /app/www/inject-env.js
echo $(cat /app/www/inject-env.js)
echo $(date) Starting Nginx… env: ${ACIDWATCH_ENVIRONMENT}
