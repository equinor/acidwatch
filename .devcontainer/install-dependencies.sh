pushd backend

python -m venv venv
source venv/bin/activate

pip install poetry
poetry install

deactivate
popd

pushd frontend
npm install
popd
