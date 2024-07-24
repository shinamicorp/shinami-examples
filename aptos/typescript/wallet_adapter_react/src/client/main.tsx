import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.js";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
      <QueryClientProvider client={queryClient}>
            <AptosWalletAdapterProvider
             autoConnect={true}
             optInWallets={["Petra"]}
             dappConfig={{ network: Network.TESTNET }}
             onError={(error) => {
               console.log("error", error);
             }}>
            <App />
            </AptosWalletAdapterProvider>
      </QueryClientProvider>
  </React.StrictMode>,
);
