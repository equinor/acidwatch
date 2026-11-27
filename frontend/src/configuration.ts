interface InjectedConfiguration {
    API_SCOPE: string;
    CLIENT_ID: string;
    APPINSIGHTS_CONNECTIONSTRING: string;
}

interface Configuration extends InjectedConfiguration {
    REDIRECT_URI: string;
    AUTHORITY: string;
}

declare global {
    interface Window {
        injectEnv: InjectedConfiguration;
    }
}

function getEnvVars(): Configuration {
    // In production the backend serves index.html and prepopulates window.injectEnv.
    // The Vite dev server serves index.html itself, so read the values from .env there.
    const injected: InjectedConfiguration = import.meta.env.DEV
        ? {
              API_SCOPE: import.meta.env.VITE_API_SCOPE,
              CLIENT_ID: import.meta.env.VITE_CLIENT_ID,
              APPINSIGHTS_CONNECTIONSTRING: import.meta.env.VITE_APPINSIGHTS_CONNECTIONSTRING,
          }
        : window.injectEnv;

    return {
        ...injected,
        REDIRECT_URI: window.location.origin,
        AUTHORITY: "https://login.microsoftonline.com/3aa4a235-b6e2-48d5-9195-7fcf05b459b0",
    };
}

const config: Configuration = getEnvVars();
export default config;
