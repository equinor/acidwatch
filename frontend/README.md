# AcidWatch frontend

## Getting Started

-   Make sure you have [Node.js](https://nodejs.org/en/download) installed on your computer.

-   Install the dependencies:

```sh
npm ci
```

-   Run the frontend locally:

```sh
npm run dev
```




## Configuration

The project is set up to read configuration from environment variables.

The setup is slightly different for local development and Docker/radix

### Local development

Set up a `.env` file based on [.env.example](.env.example) to configure environment variables. The variables begin with the prefix `VITE_`, but in the code they are referenced without the prefix.
