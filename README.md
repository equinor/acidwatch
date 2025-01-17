# AcidWatch

Welcome to the **AcidWatch** repository.

This repository is dedicated to the development of a common frontend for tools aimed at calculating and predicting chemical reactions occurring within CO<sub>2</sub> streams. Our goal is to democritise and open up the discussion around CO<sub>2</sub> impurities and to provide a reliable resource for researchers, chemists, and industry professionals interested in understanding and controlling the behavior of CO<sub>2</sub> impurities.

## Links to Access AcidWatch in the Browser (if you have Equinor account)

AcidWatch is accessible at https://acidwatch.radix.equinor.com/, which is the official link to the latest stable version of the platform. Additionally, mainly for development purposes, we maintain three environments:

-   **Development**: The latest features in active development (may be unstable). Access the dev version [here](https://frontend-acidwatch-dev.radix.equinor.com/).
-   **Testing**: For testing new features (more stable than dev). Access the test version [here](https://frontend-acidwatch-test.radix.equinor.com/).
-   **Production**: The official live platform with all tested and stable features. Access the production version [here](https://frontend-acidwatch-prod.radix.equinor.com/). The main URL (https://acidwatch.radix.equinor.com/) also directs to the production environment.

Please note: You might need appropriate permissions to access the environments.

## How to build AcidWatch locally 

Before you begin, ensure you have the following installed on your machine:

-   [Node.js](https://nodejs.org/) (version 14.x or later)
-   [npm](https://www.npmjs.com/) (version 6.x or later)
-   [Python](https://www.python.org/) (version 3.10 or later)
-   [Poetry](https://python-poetry.org/) (for managing Python dependencies)

### Getting Started

#### 1. Clone the Repository

Clone the repository to your local machine:

```sh
git clone https://github.com/your-username/acidwatch.git
cd acidwatch
```

#### 2. Start backend

Navigate to the backend directory, create a .env file based on .env.example to configure environment variables (secrets can be found in azure portal). Install the dependencies using poetry, activate the virtual environment and start server:

```sh
poetry install
poetry shell
cd src
python -m __main__
```

#### 3. Start frontend

Navigate to the frontend directory, create a .env file based on .env.example to configure environment variables. The variables begin with the prefix VITE\_, but in the code they are referenced without the prefix. Then

```sh
npm install
npm run dev
```

#### 4. Start models

This is optional, you can still do quite a lot frontend development without having any models running. Check the relevant models repos for guidance how to run locally:

-   https://github.com/equinor/arcs
-   https://github.com/equinor/co2specdemo

#### 5. Access the application

Open your browser and navigate to http://localhost:5173 to access the frontend application. The backend API will be running at http://localhost:8001. Swagger at http://localhost:8001/docs

### Debugging in Visual Studio Code

If using VS Code it is recommended to run backend in a different instances of VS Code. This will avoid a lot of hazzle configuring and running correct python virtual environment etc.

### Deployment

GitHub Actions Workflows are used for building, testing and deploying Acidwatch to Radix.

Tests are run on every push, and deployment to dev environment are done on merge to main branch

Deployment to test en prod environment are for now done manually in Radix console
