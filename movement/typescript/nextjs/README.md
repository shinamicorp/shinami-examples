# Overview
This is a simple example of combining Shinami Gas Station for feePayer transaction gas fee sponsorship on the backend with frontend signing via [`@aptos-labs/wallet-adapter-react`](https://www.npmjs.com/package/@aptos-labs/wallet-adapter-react). It pairs with our [Frontend signing and backend sponsorship tutorial](https://docs.shinami.com/developer-guides/movement/tutorials/gas-station-with-frontend-signing). We provide this example because our Gas Station does not support CORS (browser) requests for security reasons, so you need to pair backend Gas Station requests with your browser-based frontend. **This code is not meant as a template for a production app*** but instead as a quick way to show you how you can pass the relevant types between the frontend and backend. For more extensive coverage of how to integrate `@aptos-labs/wallet-adapter-react` into your Movement app, see [this doc on Movement Labs' dev docs site](https://docs.movementnetwork.xyz/devs/interactonchain/wallet-adapter/connect_wallet).

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). It's not meant as a template for a production app - it's just a very simple example showing how to pass the required data back and forth between the frontend and backend.

## Getting Started
In the root directory
1.  In your terminal, run `npm install` for dependencies
2.  In your terminal, run `cp .env .env.local` to create a local version outside version control
3. Add your Shinami Movement Gas Station API key to .env.local as the value for `SHINAMI_PRIVATE_BACKEND_GAS_AND_WALLET_API_KEY`
4. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Movement testing wallet recommendation
Nightly wallet works well with the demo as it supports Movement Testnet out of the box. Here is the [Chrome extension](https://chromewebstore.google.com/detail/nightly/fiikommddbeccaoicoejoniammnalkfa). You will need to switch your network to Movement Bardock Testnet in the Nightly UI before using your wallet with this app. This is not a recommendation to use or not use Nightly for your wallet in general, but a recommendation to use it for this sample app. If you want to try other wallets you can go to `./app/components/wallet-provider.tsx` and either remove this line completely or add some wallets from the comment into the `optInWallets` array, e.g. `optInWallets={["Nightly", "Pontem Wallet"]}`.

`optInWallets={["Nightly"]} // , "Pontem Wallet", "Backpack", "MSafe", "Bitget Wallet", "Gate Wallet", "Cosmostation Wallet", "OKX Wallet", "Petra"`
