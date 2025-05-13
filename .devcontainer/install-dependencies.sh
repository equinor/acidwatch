python3 -m venv venv

source venv/bin/activate

pip install poetry

poetry install --directory ./backend

echo "CO2SPEC_API_SCOPE=DUMMY_SCOPE">>./backend/.env
echo "CO2SPEC_API_BASE_URI=DUMMY_URL">>./backend/.env
echo "ARCS_API_BASE_URI=https://$CODESPACE_NAME-8000.app.github.dev">>./backend/.env
echo "FRONTEND_URI=https://$CODESPACE_NAME-5173.app.github.dev">>./backend/.env

deactivate 

echo "VITE_API_URL=https://$CODESPACE_NAME-8001.app.github.dev">>./frontend/.env

npm install ./frontend

git clone -b main https://github.com/equinor/arcs.git

cd arcs

git lfs pull

python3 -m venv venv

source venv/bin/activate

pip install .

