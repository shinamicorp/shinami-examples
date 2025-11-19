'use client';

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PropsWithChildren } from "react";
import { Network, AptosConfig } from "@aptos-labs/ts-sdk";

export const WalletProvider = ({ children }: PropsWithChildren) => {

    const config = new AptosConfig({
        network: Network.TESTNET,
        fullnode: 'https://testnet.movementnetwork.xyz/v1',
        faucet: 'https://faucet.testnet.movementnetwork.xyz/'
    });

    return (
        <AptosWalletAdapterProvider
            autoConnect={true}
            dappConfig={config}
            onError={(error) => {
                console.log("error", error);
            }}
        >
            {children}
        </AptosWalletAdapterProvider>
    );
};