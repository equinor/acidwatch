python3.11 -m venv venv

source venv/bin/activate

pip install poetry

poetry install --directory ./backend

deactivate 

echo "VITE_API_URL=http://localhost:8001">>./frontend/.env

npm install ./frontend

git clone -b test_compose_from_other_repo https://github.com/equinor/arcs.git

cd arcs

git lfs pull

python3.11 -m venv venv

source venv/bin/activate

pip install .



