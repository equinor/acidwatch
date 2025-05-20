import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppInsightsContext } from "@microsoft/applicationinsights-react-js";
import App from "./App";
import "./index.css";
import { msalInstance } from "./services/auth";
import { reactPlugin } from "./utils/appinsights";
import { InteractionType } from "@azure/msal-browser";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
            <QueryClientProvider client={queryClient}>
                        <App />
            </QueryClientProvider>
    </React.StrictMode>
);
