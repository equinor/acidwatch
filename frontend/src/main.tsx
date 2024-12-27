// src/main.tsx
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

const queryClient = new QueryClient();
import { InteractionType } from "@azure/msal-browser";
import { Providers } from "@microsoft/mgt";
import { Msal2Provider } from "@microsoft/mgt-msal2-provider";
import { config } from "./config/Settings";

Providers.globalProvider = new Msal2Provider({
    clientId: config.clientId || "",
    authority: config.authority,
    redirectUri: config.redirectUri,
    scopes: ["User.Read", "People.Read", "User.ReadBasic.All"],
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MsalProvider instance={msalInstance}>
            <QueryClientProvider client={queryClient}>
                <MsalAuthenticationTemplate
                    interactionType={InteractionType.Redirect}
                    authenticationRequest={{ scopes: ["user.read", "People.Read", "User.ReadBasic.All"] }}
                >
                    <AppInsightsContext.Provider value={reactPlugin}>
                        <App />
                    </AppInsightsContext.Provider>
                </MsalAuthenticationTemplate>
            </QueryClientProvider>
        </MsalProvider>
    </React.StrictMode>
);
