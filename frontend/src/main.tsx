// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
//import { MsalProvider } from "@azure/msal-react";
//import { msalInstance } from "./services/auth";
//import { MsalAuthenticationTemplate } from "@azure/msal-react";
const queryClient = new QueryClient();
//import { InteractionType } from "@azure/msal-browser";
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {/* <MsalProvider instance={msalInstance}> */}
      <QueryClientProvider client={queryClient}>
        {/* 
                TODO: create app registration in Azure AD
                <MsalAuthenticationTemplate
          interactionType={InteractionType.Redirect}
          authenticationRequest={{ scopes: ["user.read"] }}
        > */}
        <App />
        {/* </MsalAuthenticationTemplate> */}
      </QueryClientProvider>
    {/* </MsalProvider> */}
  </React.StrictMode>,
);
