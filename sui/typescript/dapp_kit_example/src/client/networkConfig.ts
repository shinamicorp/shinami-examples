import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig } =
  createNetworkConfig({
    testnet: {
      url: 'https://fullnode.testnet.sui.io:443',
    },
    mainnet: {
      url: 'https://fullnode.mainnet.sui.io:443',
    }
  });

export { networkConfig };
