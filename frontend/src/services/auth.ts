import { AccountInfo, BrowserCacheLocation, InteractionRequiredAuthError, IPublicClientApplication, PublicClientApplication } from "@azure/msal-browser";
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

export async function getAccessToken(scope?: string): Promise<string | null> {
    const scopes = [scope || config.API_SCOPE];
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

import { useMsal, useAccount } from "@azure/msal-react";

export async function getusertoken(account: AccountInfo|null, instance: IPublicClientApplication) {
    const scope = "d2e2c318-b49a-4174-b4b4-256751558dc5/.default";
    console.log("Account: ", account);
    const requestToken = async () => {
        if (account) {
            const request = {
                scopes: [scope],
                account: account,
            };
            try {
                const response = await instance.acquireTokenSilent(request);
                const accessToken = response.accessToken;
                // Use accessToken to call your API
            } catch (error) {
                if (error instanceof Error) {
                    if (error.name === "InteractionRequiredAuthError") {
                        // Fallback to interaction when silent request fails
                        instance.acquireTokenRedirect(request);
                    }
                } else {
                    // Handle other errors
                    console.error(error);
                }
            }
        }
    };
    return await requestToken();
}

await msalInstance.initialize();
msalInstance.enableAccountStorageEvents();
await msalInstance.handleRedirectPromise();
