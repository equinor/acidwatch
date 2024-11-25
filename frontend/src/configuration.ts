interface Configuration {
    API_URL: string;
    API_SCOPE: string;
    CLIENT_ID: string;
    TENANT_ID: string;
}

declare global {
    interface Window {
        injectEnv: Configuration;
    }
}

function getEnvVars(): Configuration {
    if (import.meta.env.DEV) {
        // Used for local development only
        const config: Configuration = {
            API_URL: import.meta.env.VITE_API_URL,
            API_SCOPE: import.meta.env.VITE_API_SCOPE,
            CLIENT_ID: import.meta.env.VITE_CLIENT_ID,
            TENANT_ID: import.meta.env.VITE_TENANT_ID,
        };
        return config;
    }

    // injectEnv is injected by inject-env.js based on inject-env-template.js
    return window.injectEnv;
}

const config: Configuration = getEnvVars();

export default config;
