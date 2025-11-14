![Build and deploy to Radix](https://api.radix.equinor.com/api/v1/applications/acidwatch/environments/dev/buildstatus)
![Promote prod environment](https://api.radix.equinor.com/api/v1/applications/acidwatch/environments/prod/buildstatus?pipeline=promote)

# AcidWatch

AcidWatch is a portal for tools that calculate and predict chemical reactions in
CO<sub>2</sub> streams. It is essential for advancing and scaling carbon capture
and storage (CCS) technologies. The goal of AcidWatch is to democratize and open
up the discussion around CO<sub>2</sub> impurities and provide a reliable
resource for researchers, chemists, and industry professionals in the CCS
domain.

## Using

The production version of AcidWatch is found at https://acidwatch.radix.equinor.com/ . Some features require an Equinor account with appropriate accesses.

## Developing

AcidWatch uses Python in the backend and Javascript in the frontend.
Additionally, some features require a reasonably up-to-data Java version. Ensure that you have Python 3.11 or later, [Poetry](https://python-poetry.org/), NodeJS and Java (eg. OpenJDK 21).

### Backend

The backend is written using FastAPI and SQLAlchemy.

Using Poetry, install AcidWatch's backend using the following command:

``` sh
poetry -C backend install
```

> [!NOTE]
> Here, `-C backend` instructs `poetry` to enter the `backend/` directory before
> doing anything. If you enter the `backend` directory (eg. via `cd backend`), you
> can drop writing `-C backend` for each command.

Then, run the backend in development mode using the following command:

``` sh
poetry -C backend run acidwatch-api
```

To change the settings, first copy `backend/.env.example` to `backend/.env` and
then modify it to suit your needs.

To install and run a production build of the backend, refer to [the backend
Dockerfile](./backend/Dockerfile).

Explore the auto-generated REST API at http://localhost:8001/docs

#### SQLite
By default, AcidWatch uses an in-memory SQLite database. It requires no
additional installation or setup, but will reset whenever the backend is
restarted.

To enable a persistent SQLite database, set `ACIDWATCH_DATABASE` in
`backend/.env` file. For example, adding the following will create a `test.db`
file in the directory from which `acidwatch-api` is ran:

``` sh
ACIDWATCH_DATABASE=sqlite:///test.db
```

> [!TIP]
> Database migration aren't applied to SQLite. If mysterious database errors
> occur, delete your database file and restart.

#### PostgreSQL
AcidWatch uses a PostgreSQL database in production. Once you have access 

First, ensure that the backend is installed with the `pg` (PostgreSQL) optional
dependency group. This installs the recommended SQLAlchemy driver:

``` sh
poetry -C backend install -E pg
```

Then, set the `ACIDWATCH_DATABASE` as described in the [SQLite section](#SQLite) to the following:

``` sh
# Over TCP/IP
ACIDWATCH_DATABASE=postgres://[username]:[password]@[hostname]:[port]/[database]

# Over UNIX sockets
ACIDWATCH_DATABASE=postgres:///[database]?host=[path]

# For example:
ACIDWATCH_DATABASE=postgres://postgres:password@localhost:5432/acidwatch
```

AcidWatch uses SQLAlchemy's Alembic to handle migrations. Run `poetry -C backend
run alembic migrate head` to migrate the database to the current schema.

#### Other databases & related material

For other databases, refer to SQLAlchemy documentation on how to create

### Frontend

The frontend uses Vite and React. Components are provided by the official
[Equinor Design System](https://eds.equinor.com) React library.


``` sh
# Copy the .env file
cp frontend/.env.example frontend/.env

# then install
npm -C frontend install
```

To run, ensure that the backend is running on port 8001 and then:

``` sh
npm -C run dev
```

The application is now available at http://localhost:5173

## Considerations

### Debugging in Visual Studio Code

If using VS Code it is recommended to run backend in a different instances of VS Code. This will avoid a lot of hazzle configuring and running correct python virtual environment etc.

### Deployment

GitHub Actions Workflows are used for building, testing and deploying AcidWatch to Radix.

Tests are run on every push, and deployment to dev environment are done on merge to main branch.

Deployment to test and prod environment are for now done manually in Radix console.

### GitHub Codespaces

If someone fancies using codespaces and wants to break out of the tedious local setup then following steps can be followed. 

#### 1. Setup frontend 

Open a terminal and write following commands to run frontend. 

```sh
cd /frontend
npm run dev
```

#### 2. Setup backend 

Open another terminal and write following commands to enable virtual environment and then to run backend. 

```sh
source venv/bin/activate .
python3 backend/src/acidwatch_api/__main__.py
```

#### 3. Toggle port visibility

Kudos! Now frontend is running on port 5173, and backend is on 8001. Toggle the port for backend only to be public so its accessible by frontend. 

#### 4. Point to a different deployment environment

Now open source models can be run and tested. To point to a different instance of deployment (dev, prod or local) install-dependencies.sh can be updated.  
