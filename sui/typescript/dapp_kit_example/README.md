# Shinami Sponsored Transaction example with dapp-kit
This is a simple example showing how to:
1. Collect user input on the frontend that will be used to build a Move call transaction.
2. Send that data to the backend and construct a gasless transaction using that data.

and then:

_If there is NOT a connected browser wallet_
4. Sponsor, sign, and execute that transaction in one request with Shinami's Invisible Wallet API.
5. Return the result to the frontend.

_Or, if there IS a connected browser wallet_
4. Sponsor that transaction with Shinami's Gas Station.
5. Return the sponsored transaction and sponsor signature to the frontend.
6. Obtain the sender signature from the user via the dapp-kit connection to their connected wallet.
7. Send the sender signature, along with the sponsored transaction and sponsor signature, to the backend. 
8. Execute the transaction using Shinami's Node Service. Return the result to the frontend.

Finally, on the frontend:
- Poll the Full node represented by Mysten's dapp-kit `SuiClientProvider` for the digest returned from
  the backend. Upon response from the Full node, update the page state with the result of the Move call.


# Setup and running the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, uncomment and set values for ALL_SERVICES_TESTNET_ACCESS_KEY, as well as a USER123_WALLET_ID and USER123_WALLET_SECRET for creating a Shinami Invisible Wallet. 
4. Set a value for `NODE_SERVICE_PUBLICLY_VISIBLE_TESTNET_ACCESS_KEY` in `src/config.ts`. This will be a publicy-visible Shinami Node Service
   API access key used for fetching transaction information on the frontend. Save the change.
5. Run `pnpm dev` to run the server.  
6. Visit [localhost](http://localhost:3000/) in your browser to use the app.