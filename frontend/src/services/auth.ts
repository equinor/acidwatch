import { BrowserCacheLocation, InteractionRequiredAuthError, PublicClientApplication } from "@azure/msal-browser";
import { Providers, Msal2Provider } from "@microsoft/mgt";
import config from "../configuration";

// Initialize PublicClientApplication
export const msalInstance: PublicClientApplication = new PublicClientApplication({
    auth: {
        clientId: config.CLIENT_ID || "",
        authority: config.AUTHORITY,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: BrowserCacheLocation.SessionStorage,
        storeAuthStateInCookie: false,
    },
});

// Initialize Msal2Provider with PublicClientApplication
Providers.globalProvider = new Msal2Provider({
    publicClientApplication: msalInstance as any,
    scopes: ["User.Read", "People.Read", "User.ReadBasic.All"],
});

export async function getAccessToken(): Promise<string | null> {
    try {
        const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: config.MSAL_SCOPES || [],
            forceRefresh: false,
        });
        return tokenResponse.accessToken;
    } catch (error) {
        console.error(error);
        if (error instanceof InteractionRequiredAuthError) {
            await msalInstance.acquireTokenRedirect({
                scopes: config.MSAL_SCOPES || [],
            });
            return null;
        }
        return null;
    }
}

await msalInstance.initialize();
msalInstance.enableAccountStorageEvents();
await msalInstance.handleRedirectPromise();
