interface Configuration {
    API_URL: string;
    API_SCOPE: string;
    CLIENT_ID: string;
    TENANT_ID: string;
    APPINSIGHTS_CONNECTIONSTRING: string;
    REDIRECT_URI: string;
    AUTHORITY: string;
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
            APPINSIGHTS_CONNECTIONSTRING: import.meta.env.VITE_APPINSIGHTS_CONNECTIONSTRING,
            REDIRECT_URI: window.location.origin,
            AUTHORITY: "https://login.microsoftonline.com/3aa4a235-b6e2-48d5-9195-7fcf05b459b0",
        };
        return config;
    }

    // injectEnv is injected by inject-env.js based on inject-env-template.js
    return {
        ...window.injectEnv,
        REDIRECT_URI: window.location.origin,
        AUTHORITY: "https://login.microsoftonline.com/3aa4a235-b6e2-48d5-9195-7fcf05b459b0",
    };
}

const config: Configuration = getEnvVars();
console.log("Configuration", config);
export default config;
