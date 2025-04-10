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
