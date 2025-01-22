import { getFullnodeUrl } from "@mysten/sui/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig } =
  createNetworkConfig({
    testnet: {
      url: import.meta.env.VITE_SHINAMI_PUBLIC_TESTNET_NODE_URL_AND_API_KEY || getFullnodeUrl('testnet'),
    },
    mainnet: {
      url: getFullnodeUrl('mainnet'),
    }
  });

export { networkConfig };
