# Shinami backend transaction sponsorship + frontend signing example (using @aptos-labs/wallet-adapter-react)
## Overview
This is a simple example of combining Shinami Gas Station for feePayer transaction gas fee sponsorship on the backend with frontend signing via [`@aptos-labs/wallet-adapter-react`](https://www.npmjs.com/package/@aptos-labs/wallet-adapter-react). We provide this example because our Gas Station does not support CORS (browser) requests for security reasons, so you need to pair backend Gas Station requests with your browser-based frontend. The example also includes a backend [Shinami Invisible Wallet](https://docs.shinami.com/api-docs/aptos/wallet-services/invisible-wallet-api) (embedded NFT wallet for Web2-native users) that acts as the sender when there is no connected wallet. This code is not meant as a template for a production app, but instead as a quick way to show you how you can pass the relevant types between the frontend and backend. It pairs with our [Frontend signing and backend sponsorship tutorial](https://docs.shinami.com/developer-guides/aptos/tutorials/gas-station-with-frontend-signing). 

## Steps to set up and run the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, uncomment and set the value for ALL_SERVICES_TESTNET_ACCESS_KEY: your Shinami API access key with rights to Gas Station, Wallet Services, and Node Services (which you create in your Shinami dashboard: https://app.shinami.com/access-keys)
4. In your .env.local file, uncomment and set the value for VITE_SHINAMI_PUBLIC_APTOS_TESTNET_NODE_API_KEY: your Shinami API access key with rights to Node Services for Testnet. This is a public key, which you can protect with a deomain allowlist in a production app.
5. In your .env.local file, uncomment and set the values for USER123_WALLET_ID and USER123_WALLET_SECRET (used for creating a Shinami Invisible Wallet). These values must be set. Just for the purposes of this test you could set them to something like 'wallet1' and 'secret1'.
6. Run `npm run dev` to run the server.  
7. Visit [localhost](http://localhost:3000/) in your browser to use the app.


For a connected wallet transaction, you will always sign on the frontend and sponsor on the backend. However, you can vary where the transaction is built and where it is submitted. You do so by commenting out the `await connectedWalletTxFEBuildBESubmit(message, currentAccount);` in [`src/client/App.tsx`](https://github.com/shinamicorp/shinami-examples/blob/main/aptos/typescript/wallet_adapter_react/src/client/App.tsx#L54) and uncommenting the version you want, e.g.:

      if (currentAccount) { // if you've connected a wallet
        pendingTxResponse =
        //  await connectedWalletTxFEBuildBESubmit(message, currentAccount.toString());
          await connectedWalletTxBEBuildFESubmit(message, currentAccount.toString());
        // await connectedWalletTxBEBuildBESubmit(message, currentAccount.toString());
        // await connectedWalletTxFEBuildFESubmit(message, currentAccount.toString());
      } else {
        pendingTxResponse = await invisibleWalletTx(message);
      }