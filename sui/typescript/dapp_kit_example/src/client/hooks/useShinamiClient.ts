import type { SuiClient } from '@mysten/sui/client';
import { useContext } from 'react';
import { ShinamiClientContext } from "../components/ShinamiClientProvider.js";

export function useShinamiClientContext() {
    const shinamiClient = useContext(ShinamiClientContext);

    if (!shinamiClient) {
        throw new Error(
            "Could not find ShinamiClientContext. Ensure that you have set up the ShinamiClientProvider"
        );
    }

    return shinamiClient;
}

export function useShinamiClient(): SuiClient {
    return useShinamiClientContext().client;
}