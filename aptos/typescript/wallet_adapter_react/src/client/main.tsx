import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PontemWallet } from "@pontem/wallet-adapter-plugin";
import { Network } from "@aptos-labs/ts-sdk";

const wallets = [
  new PontemWallet()
];

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      dappConfig={{ network: Network.TESTNET }}
      onError={(error) => {
        console.log("error", error);
      }}>
      <App />
    </AptosWalletAdapterProvider>
  </React.StrictMode>,
);
