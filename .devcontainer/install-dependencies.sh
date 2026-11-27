uv sync --directory ./backend --extra pg

cp ./backend/.env.example ./backend/.env

cp ./frontend/.env.example ./frontend/.env

cd frontend

npm install
