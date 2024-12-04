interface IAppConfig {
    appEnv?: string;
    apiUrl?: string;
    layoutUrl?: string;
    clientId?: string;
    tenantId?: string;
    authority?: string;
    MsalScopes?: Array<string>;
    redirectUri?: string;
}

export const stringFormat = (template: string, ...args: Array<string>): string => {
    return template.replace(/{(\d+)}/g, (match, number) => {
        return typeof args[number] !== "undefined" ? args[number] : match;
    });
};

export const config: IAppConfig = {
    appEnv: "local",
    clientId: import.meta.env.VITE_CLIENT_ID,
    tenantId: import.meta.env.VITE_TENANT_ID,
    authority: "https://login.microsoftonline.com/3aa4a235-b6e2-48d5-9195-7fcf05b459b0",
    MsalScopes: [import.meta.env.VITE_API_SCOPE, "offline_access", "openid"],
    redirectUri: "http://localhost:3000/",
};
