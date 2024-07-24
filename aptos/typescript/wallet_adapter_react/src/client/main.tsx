import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { Network } from "@aptos-labs/ts-sdk";


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
            <AptosWalletAdapterProvider
             autoConnect={true}
             optInWallets={["Petra"]}
             dappConfig={{ network: Network.TESTNET }}
             onError={(error) => {
               console.log("error", error);
             }}>
            <App />
            </AptosWalletAdapterProvider>
  </React.StrictMode>,
);
