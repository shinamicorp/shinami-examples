import { getFullnodeUrl } from "@mysten/sui/client";
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
