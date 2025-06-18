import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppInsightsContext } from "@microsoft/applicationinsights-react-js";
import App from "./App";
import "./index.css";
import { MsalProvider } from "@azure/msal-react";
import { msalInstance } from "./services/auth";
import { reactPlugin } from "./utils/appinsights";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <MsalProvider instance={msalInstance}>
            <QueryClientProvider client={queryClient}>
                <AppInsightsContext.Provider value={reactPlugin}>
                    <App />
                </AppInsightsContext.Provider>
            </QueryClientProvider>
        </MsalProvider>
    </React.StrictMode>
);
