# Shinami Sponsored Transaction example with dapp-kit
This is a simple example showing how to combine Gas Station backend sponsorship with a frontend that collects transaction input - and optionally a signature - from the user. We provide this example because our Gas Station does not support CORS (browser) requests for security reasons, so you need to pair backend Gas Station requests with your browser-based frontend. It pairs with our [Frontend signing and backend sponsorship tutorial](https://docs.shinami.com/developer-guides/sui/tutorials/gas-station-with-frontend-signing). 

It's not meant as a starter template for a production app. It's just a bare-bones examle that shows how to:
1. FE: Collect user input that will be used to build a Move call transaction and send that data to the backend.
2. FE or BE: Construct a gasless transaction using the data.

and then:

_If there is NOT a connected browser wallet_
4. BE: Sponsor, sign, and execute that transaction in one request with Shinami's Invisible Wallet API.
5. BE: Return the result to the frontend.

_Or, if there IS a connected browser wallet_
4. BE: Sponsor that transaction with Shinami's Gas Station.
5. BE: Return the sponsored transaction and sponsor signature to the frontend.
6. FE: Obtain the sender signature from the user via the dapp-kit connection to their connected wallet.
7. BE or FE: execute the transaction using Shinami's Node Service.

And the last step in both cases:
- FE: Poll a Sui Full node for information about the transaction digest returned from the backend. Upon successful response from the Full node, update the page state with the result of the Move call.


# Setup and running the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, uncomment and set values for ALL_SERVICES_TESTNET_ACCESS_KEY, as well as a USER123_WALLET_ID and USER123_WALLET_SECRET for creating a Shinami Invisible Wallet. You must set these and, only for the purposes of this simple test, can use something like 'wallet1' and 'secret1'.
4. Set a value for `NODE_SERVICE_PUBLICLY_VISIBLE_TESTNET_ACCESS_KEY` in `src/config.ts`. This will be a publicy-visible Shinami Node Service
   API access key used for fetching transaction information on the frontend. Save the change.
5. Run `npm run dev` to run the server.  
6. Visit [localhost](http://localhost:3000/) in your browser to use the app.