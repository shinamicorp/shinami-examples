import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { AptosConfig, Network } from "@aptos-labs/ts-sdk";

const config = new AptosConfig({
  network: Network.TESTNET,
  fullnode: 'https://testnet.movementnetwork.xyz/v1',
  faucet: 'https://faucet.testnet.movementnetwork.xyz/'
})

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={config}
      onError={(error) => {
        console.log("error", error);
      }}
    >
      <App />
    </AptosWalletAdapterProvider>
  </React.StrictMode>,
);
