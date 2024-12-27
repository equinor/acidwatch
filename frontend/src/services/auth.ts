import {
    AuthenticationResult,
    BrowserCacheLocation,
    EventType,
    InteractionRequiredAuthError,
    PublicClientApplication,
} from "@azure/msal-browser";

import { config } from "../config/Settings";

export const msalInstance = new PublicClientApplication({
    auth: {
        clientId: config.clientId || "",
        authority: config.authority,
        redirectUri: window.location.origin,
    },
    cache: {
        // Cache location gives a tradeoff between security and user experience
        // Using local storage instead of session storage allows login and logout to work across browser tabs
        cacheLocation: BrowserCacheLocation.SessionStorage,
        storeAuthStateInCookie: false,
    },
});

function getTenantAccount() {
    const currentAccounts = msalInstance.getAllAccounts();
    if (!currentAccounts) {
        return null;
    }
    return currentAccounts.find((acc) => acc.tenantId === config.tenantId);
}

export async function getAccessToken(): Promise<string | null> {
    try {
        const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: config.MsalScopes || [],
            forceRefresh: false,
        });
        return tokenResponse.accessToken;
    } catch (error) {
        console.error(error);
        if (error instanceof InteractionRequiredAuthError) {
            await msalInstance.acquireTokenRedirect({
                scopes: config.MsalScopes || [],
            });
            return null;
        }
        return null;
    }
}

await msalInstance.initialize();
msalInstance.enableAccountStorageEvents();
await msalInstance.handleRedirectPromise();
if (!msalInstance.getActiveAccount()) {
    const account = getTenantAccount();
    if (account !== undefined) {
        msalInstance.setActiveAccount(account);
    }
}

msalInstance.addEventCallback((event) => {
    if (event.eventType === EventType.LOGIN_SUCCESS) {
        console.log("log in");
        const payload = event.payload as AuthenticationResult;
        msalInstance.setActiveAccount(payload.account);
    } else if (event.eventType === EventType.LOGOUT_SUCCESS) {
        console.log("log out");
        msalInstance.setActiveAccount(null);
    }
});
