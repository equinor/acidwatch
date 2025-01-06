import { Providers, ProviderState } from "@microsoft/mgt";
import { Msal2Provider } from "@microsoft/mgt-msal2-provider";
import { config } from "./config/Settings";

// Initialize Msal2Provider before any other imports or component rendering
try {
    Providers.globalProvider = new Msal2Provider({
        clientId: config.clientId || "",
        authority: config.authority,
        redirectUri: window.location.origin,
        scopes: ["User.Read", "People.Read", "User.ReadBasic.All"],
    });
    console.log("Msal2Provider initialized successfully");
    console.log("Providers.globalProvider:", Providers.globalProvider);
} catch (error) {
    console.log("Error initializing Msal2Provider:", error);
}

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppInsightsContext } from "@microsoft/applicationinsights-react-js";
import App from "./App";
import "./index.css";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./services/auth";
import { MsalAuthenticationTemplate } from "@azure/msal-react";
import { reactPlugin } from "./utils/appinsights";
import { InteractionType } from "@azure/msal-browser";

const queryClient = new QueryClient();

const checkProviderState = () => {
    const provider = Providers.globalProvider;
    if (provider) {
        console.log("Provider state:", provider.state);
        if (provider.state === ProviderState.SignedIn) {
            console.log("Provider is signed in");
        } else if (provider.state === ProviderState.SignedOut) {
            console.log("Provider is signed out");
        } else if (provider.state === ProviderState.Loading) {
            console.log("Provider is loading");
        }
    } else {
        console.error("Provider not initialized");
    }
};

checkProviderState();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MsalProvider instance={msalInstance}>
            <QueryClientProvider client={queryClient}>
                <MsalAuthenticationTemplate
                    interactionType={InteractionType.Redirect}
                    authenticationRequest={{ scopes: ["user.read", "People.Read", "User.ReadBasic.All"] }}
                    errorComponent={({ error }) => {
                        console.log("Authentication error:", error);
                        return <div>Error: {error ? error.message : "Unknown error"}</div>;
                    }}
                >
                    <AppInsightsContext.Provider value={reactPlugin}>
                        <App />
                    </AppInsightsContext.Provider>
                </MsalAuthenticationTemplate>
            </QueryClientProvider>
        </MsalProvider>
    </React.StrictMode>
);
