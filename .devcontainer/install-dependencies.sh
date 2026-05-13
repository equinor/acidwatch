pip install uv

uv sync --directory ./backend --extra pg

cp ./backend/.env.example ./backend/.env
echo "ARCS_API_BASE_URI=https://api-arcs-prod.radix.equinor.com">>./backend/.env
if [ -n "$CODESPACE_NAME" ]; then
    echo "FRONTEND_URI=https://$CODESPACE_NAME-5173.app.github.dev">>./backend/.env
fi

cp ./frontend/.env.example ./frontend/.env
if [ -n "$CODESPACE_NAME" ]; then
    echo "VITE_API_URL=https://$CODESPACE_NAME-8001.app.github.dev">>./frontend/.env
fi

cd frontend

npm install


