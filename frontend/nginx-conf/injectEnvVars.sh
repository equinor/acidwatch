envsubst < /app/www/inject-env-template.js > /app/www/inject-env.js
envsubst '${OASIS_URL} ${OASIS_HOST}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf
echo "===== Rendered /etc/nginx/conf.d/default.conf ====="
cat /etc/nginx/conf.d/default.conf
echo "===================================================="
echo $(cat /app/www/inject-env.js)
echo $(date) Starting Nginx… env: ${ACIDWATCH_ENVIRONMENT}
