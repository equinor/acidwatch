# AcidWatch frontend

## Getting Started

- Make sure you have [Node.js](https://nodejs.org/en/download) installed on your computer.

- Install the dependencies:

```sh
npm ci
```

- Run the frontend locally:

```sh
npm run dev
```

## Configuration

The project is set up to read configuration from environment variables.

The setup is slightly different for local development and Docker/radix

### Local development

Set up a `.env` file based on [.env.example](.env.example) to configure environment variables. The variables begin with the prefix `VITE_`, but in the code they are referenced without the prefix.

API calls go to `/api` on the same address as the frontend. The dev server forwards them to the backend at `API_PROXY_TARGET` (default `http://localhost:8000`).

### Docker/Radix

The frontend is built into the backend image, and the backend serves it. When serving `index.html` the backend fills in `window.injectEnv` with the client ID, API scope and Application Insights connection string from its own settings, so the frontend needs no configuration of its own.
