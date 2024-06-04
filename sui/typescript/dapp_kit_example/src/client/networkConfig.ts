import { getFullnodeUrl } from "@mysten/sui.js/client";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig } =
  createNetworkConfig({
    testnet: {
      url: getFullnodeUrl("testnet")
    },
    mainnet: {
      url: getFullnodeUrl("mainnet")
    }
  });

export { networkConfig };
