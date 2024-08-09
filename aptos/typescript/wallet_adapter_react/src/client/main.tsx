import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.js";
import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PontemWallet } from "@pontem/wallet-adapter-plugin";
import { Network } from "@aptos-labs/ts-sdk";
import { PontemWalletAdapter, WalletProvider } from '@manahippo/aptos-wallet-adapter';

const wallets = [
  new PontemWallet()
];

const wpWallets = [
  new PontemWalletAdapter()
];


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
            <WalletProvider
            wallets={wpWallets}
            onError={(error: Error) => {
              console.log('Handle Error Message', error)
            }}>
            <AptosWalletAdapterProvider
            plugins={wallets}
             autoConnect={true}
             optInWallets={["Petra"]}
             dappConfig={{ network: Network.TESTNET }}
             onError={(error) => {
               console.log("error", error);
             }}>
            <App />
            </AptosWalletAdapterProvider>
            </WalletProvider>
  </React.StrictMode>,
);
