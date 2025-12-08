# Shinami backend transaction sponsorship + frontend signing example (using @aptos-labs/wallet-adapter-react)
## Overview
This is a simple example of combining Shinami Gas Station for feePayer transaction gas fee sponsorship on the backend with frontend signing via [`@aptos-labs/wallet-adapter-react`](https://www.npmjs.com/package/@aptos-labs/wallet-adapter-react). It pairs with our [Frontend signing and backend sponsorship tutorial](https://docs.shinami.com/developer-guides/movement/tutorials/gas-station-with-frontend-signing). We provide this example because our Gas Station does not support CORS (browser) requests for security reasons, so you need to pair backend Gas Station requests with your browser-based frontend.  The example also includes a backend [Shinami Invisible Wallet](https://docs.shinami.com/api-docs/movement/wallet-services/invisible-wallet-api) (embedded NFT wallet for Web2-native users) that acts as the sender when there is no connected wallet. **This code is not meant as a template for a production app*** but instead as a quick way to show you how you can pass the relevant types between the frontend and backend. For more extensive coverage of how to integrate `@aptos-labs/wallet-adapter-react` into your Movement app, see [this doc on Movement Labs' dev docs site](https://docs.movementnetwork.xyz/devs/interactonchain/wallet-adapter/connect_wallet).

## Steps to set up and run the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so they won't be committed to github)
3. In your .env.local file, uncomment and set the value for GAS_STATION_AND_WALLET_TESTNET_BE_KEY: your Shinami API access key with rights to Gas Station on Movement Testnet and Wallet Services (which you create in your Shinami dashboard: https://app.shinami.com/access-keys). 
6. Run `npm run dev` to run the server.  
7. Visit [localhost](http://localhost:3000/) in your browser to use the app.

Nightly wallet works well with the demo as it supports Movement Testnet out of the box. Here is the [Chrome extension](https://chromewebstore.google.com/detail/nightly/fiikommddbeccaoicoejoniammnalkfa). You will need to switch your network to Movement Bardock Testnet in the Nightly UI before using your wallet with this app. [Razor wallet](https://chromewebstore.google.com/detail/razor-wallet/fdcnegogpncmfejlfnffnofpngdiejii) has worked well in testing, also, but is not used by detault because it is appearing twice in the list of wallets. This is not a recommendation to use or not use Nightly or Razor for your wallet in general, but a recommendation to use it for this sample app. If you want to use Razor (or try another wallet) you can go to `./src/client/main.tsx` and comment out or remove this entire line:

`optInWallets={["Nightly"]} // , "Pontem Wallet", "Backpack", "MSafe", "Bitget Wallet", "Gate Wallet", "Cosmostation Wallet", "OKX Wallet", "Petra"`


For a connected wallet transaction, you will always sign on the frontend and sponsor on the backend. However, you can vary where the transaction is built and where it is submitted. You do so by commenting out the `await connectedWalletTxFEBuildBESubmit(message, currentAccount);` in [`src/client/App.tsx`](https://github.com/shinamicorp/shinami-examples/blob/main/movement/typescript/wallet_adapter_react/src/client/App.tsx#L57) and uncommenting the version you want, e.g.:

      if (currentAccount) { // if you've connected a wallet
        pendingTxResponse =
        //  await connectedWalletTxFEBuildBESubmit(message, currentAccount.toString());
          await connectedWalletTxBEBuildFESubmit(message, currentAccount.toString());
        // await connectedWalletTxBEBuildBESubmit(message, currentAccount.toString());
        // await connectedWalletTxFEBuildFESubmit(message, currentAccount.toString());
      } else {
        pendingTxResponse = await invisibleWalletTx(message);
      }