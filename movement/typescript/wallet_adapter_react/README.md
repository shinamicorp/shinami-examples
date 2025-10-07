# Shinami backend transaction sponsorship + frontend signing example (using @aptos-labs/wallet-adapter-react)
## Overview
This is a simple example of combining Shinami Gas Station for feePayer transaction gas fee sponsorship on the backend with frontend signing via [`@aptos-labs/wallet-adapter-react`](https://www.npmjs.com/package/@aptos-labs/wallet-adapter-react). We provide this example because our Gas Station does not support CORS (browser) requests for security reasons, so you need to pair backend Gas Station requests with your browser-based frontend. **This code is not meant as a template for a production app*** but instead as a quick way to show you how you can pass the relevant types between the frontend and backend. It pairs with our [Frontend signing and backend sponsorship tutorial](https://docs.shinami.com/developer-guides/movement/tutorials/gas-station-with-frontend-signingg). 

## Steps to set up and run the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so they won't be committed to github)
3. In your .env.local file, uncomment and set the value for GAS_STATION_TESTNET_BE_KEY: your Shinami API access key with rights to Gas Station on Movement Testnet (which you create in your Shinami dashboard: https://app.shinami.com/access-keys).
6. Run `npm run dev` to run the server.  
7. Visit [localhost](http://localhost:3000/) in your browser to use the app.


For a connected wallet transaction, you will always sign on the frontend and sponsor on the backend. However, you can vary where the transaction is built and where it is submitted. You do so by commenting out the `await connectedWalletTxFEBuildBESubmit(message, currentAccount);` in [`src/client/App.tsx`](https://github.com/shinamicorp/shinami-examples/blob/main/movement/typescript/wallet_adapter_react/src/client/App.tsx#L55) and uncommenting the version you want, e.g.:

      if (currentAccount) { // if you've connected a wallet
        pendingTxResponse =
        //  await connectedWalletTxFEBuildBESubmit(message, currentAccount.toString());
          await connectedWalletTxBEBuildFESubmit(message, currentAccount.toString());
        // await connectedWalletTxBEBuildBESubmit(message, currentAccount.toString());
        // await connectedWalletTxFEBuildFESubmit(message, currentAccount.toString());
      } else {
        pendingTxResponse = await invisibleWalletTx(message);
      }