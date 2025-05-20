python3.11 -m venv venv

source venv/bin/activate

pip install poetry

poetry install --directory ./backend

deactivate 

echo "VITE_API_URL=https://bookish-space-parakeet-6q5jv596x56c5r5w-8001.app.github.dev">>./frontend/.env

npm install ./frontend

git clone -b main https://github.com/equinor/arcs.git

cd arcs

git lfs pull

python3.11 -m venv venv

source venv/bin/activate

pip install .
