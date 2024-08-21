import { createSuiClient } from "@shinami/clients/sui";
import { SuiClient } from "@mysten/sui/client";
import { createContext } from "react";
import { NODE_SERVICE_PUBLICLY_VISIBLE_TESTNET_ACCESS_KEY } from "../config.js";

export interface ShinamiClientProviderContext {
    client: SuiClient;
}

export const ShinamiClientContext = createContext<ShinamiClientProviderContext | null>(null);

export type ShinamiClientProviderProps = {
    children?: React.ReactNode;
};

export function ShinamiClientProvider(props: ShinamiClientProviderProps) {
    const { children } = props;

    const client = createSuiClient(NODE_SERVICE_PUBLICLY_VISIBLE_TESTNET_ACCESS_KEY);
    const ctx: ShinamiClientProviderContext = { client };
    return <ShinamiClientContext.Provider value={ctx}>{children}</ShinamiClientContext.Provider>;
}