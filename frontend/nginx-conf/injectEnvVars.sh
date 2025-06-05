envsubst < /app/www/inject-env-template.js > /app/www/inject-env.js
envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
echo $(cat /app/www/inject-env.js)
echo "===== Rendered /etc/nginx/conf.d/default.conf ====="
cat /etc/nginx/conf.d/default.conf
echo "===================================================="
echo $(date) Starting Nginx… env: ${ACIDWATCH_ENVIRONMENT}
