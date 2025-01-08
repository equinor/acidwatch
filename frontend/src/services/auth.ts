import {
    AccountInfo,
    AuthenticationResult,
    BrowserCacheLocation,
    EventType,
    InteractionRequiredAuthError,
    InteractionType,
    PublicClientApplication,
} from "@azure/msal-browser";
import { AuthCodeMSALBrowserAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser";

import { config } from "../config/Settings";
import { Client } from "@microsoft/microsoft-graph-client";
import { Providers, Msal2Provider } from "@microsoft/mgt";
//import { Msal2Provider } from "@microsoft/mgt-msal2-provider";

// Initialize PublicClientApplication
export const msalInstance: PublicClientApplication = new PublicClientApplication({
    auth: {
        clientId: config.clientId || "",
        authority: config.authority,
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

// msalInstance.addEventCallback((event) => {
//     if (event.eventType === EventType.LOGIN_SUCCESS) {
//         console.log("log in");
//         const payload = event.payload as AuthenticationResult;
//         msalInstance.setActiveAccount(payload.account);
//     } else if (event.eventType === EventType.LOGOUT_SUCCESS) {
//         console.log("log out");
//         msalInstance.setActiveAccount(null);
//     }
// });

async function testGraphApiAccess() {
    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
        account: msalInstance.getActiveAccount() as AccountInfo,
        scopes: ["User.Read", "People.Read", "User.ReadBasic.All"],
        interactionType: InteractionType.Popup,
    });
    const client = Client.initWithMiddleware({ authProvider });
    try {
        const me = await client.api("/me").get();
        console.log("Graph API call successful:", me);
    } catch (error) {
        console.error("Graph API call failed:", error);
    }
}

await testGraphApiAccess();
