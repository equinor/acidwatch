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

// Initialize Msal2Provider wtith PublicClientApplication
Providers.globalProvider = new Msal2Provider({
    publicClientApplication: msalInstance as any,
    scopes: ["User.Read", "People.Read", "User.ReadBasic.All"],
});

export async function getAccessToken(scope?: string): Promise<string | null> {
    const accounts = msalInstance.getAllAccounts();
    const scopes = [scope || config.API_SCOPE];
    if (accounts.length == 0) {
        return null;
    }
    try {
        const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: scopes,
            forceRefresh: false,
        });
        return tokenResponse.accessToken;
    } catch (error) {
        console.error(error);
        if (error instanceof InteractionRequiredAuthError) {
            await msalInstance.acquireTokenRedirect({
                scopes: scopes,
            });
            return null;
        }
        return null;
    }
}

export async function getUserToken(scope?: string): Promise<string | null> {
    const scopes = [scope || config.API_SCOPE];
    const account = msalInstance.getActiveAccount(); // Get logged-in user

    if (!account) {
        console.error("No active user session found.");
        return null;
    }

    try {
        const tokenResponse = await msalInstance.acquireTokenSilent({
            scopes: scopes,
            account: account, // Ensure token is retrieved for the logged-in user
            forceRefresh: false,
        });
        return tokenResponse.accessToken;
    } catch (error) {
        console.error("Error acquiring token silently:", error);
        if (error instanceof InteractionRequiredAuthError) {
            try {
                await msalInstance.acquireTokenRedirect({ scopes: scopes });
            } catch (redirectError) {
                console.error("Error with interactive token request:", redirectError);
            }
        }
        return null;
    }
}

msalInstance.enableAccountStorageEvents();
