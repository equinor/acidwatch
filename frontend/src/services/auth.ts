import {
    AccountInfo,
    AuthenticationResult,
    BrowserCacheLocation,
    EventType,
    InteractionRequiredAuthError,
    InteractionType,
    PublicClientApplication,
} from "@azure/msal-browser";
import { config } from "../config/Settings";
import { Providers, ProviderState } from "@microsoft/mgt";
import { Msal2Provider } from "@microsoft/mgt-msal2-provider";
import { Client } from "@microsoft/microsoft-graph-client";
import { AuthCodeMSALBrowserAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/authCodeMsalBrowser";

Providers.globalProvider = new Msal2Provider({
    clientId: config.clientId || "",
    authority: config.authority,
    redirectUri: window.location.origin,
    scopes: ["User.Read", "People.Read", "User.ReadBasic.All"],
});

const provider = Providers.globalProvider;

// const checkProviderState = async () => {
//     if (provider) {
//         console.log("Provider state:", provider.state);
//         while (provider.state === ProviderState.Loading) {
//             console.log("Provider is loading, waiting...");
//             await new Promise((resolve) => setTimeout(resolve, 100));
//         }
//         if (provider.state === ProviderState.SignedIn) {
//             console.log("Provider is signed in");
//         } else if (provider.state === ProviderState.SignedOut) {
//             console.log("Provider is signed out");
//             if (provider.login) {
//                 await provider.login();
//             } else {
//                 console.error("Login method not available on provider");
//             }
//         }
//     } else {
//         console.error("Provider not initialized");
//     }
// };

//await checkProviderState();

export const msalInstance = new PublicClientApplication({
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

async function testGraphApiAccess() {
    const authProvider = new AuthCodeMSALBrowserAuthenticationProvider(msalInstance, {
        account: msalInstance.getActiveAccount() as AccountInfo,
        scopes: ["User.Read", "People.Read", "User.ReadBasic.All"],
        interactionType: InteractionType.Silent,
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
