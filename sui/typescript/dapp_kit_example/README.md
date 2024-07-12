# Shinami Sponsored Transaction example with dapp-kit
This is a simple example showing how to:
1. Collect user input on the frontend that will be used to build a transaction
2. Send that data to the backend
3. Construct a Move call transaction using that data.

and then either

(If there is not a connected browser wallet)
4. Sponsor, sign, and execute that transaction in one request that uses Shinami's Gas Station, Invisible Wallet, and Node Service APIs
5. Return the result to the FE

(If there is a connected browser wallet)
4. Sponsor that transaction with Shinami's Gas Station.
5. Return the sposonsored transction, which now includes Gas data, and the sponsor signature to the frontent.
6. Obtain the sender signature from the user via the dapp-kit connection to their connected wallet.
7. Submit the transaction for execution, along with both sender and sponsor signature, from the frontend.


# Setup
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, set the values for your Shinami access key, as well as a walletId and walletSecret for creating a Shinami Invisible Wallet. 
4. Run `pnpm dev` to run the server.  
5. Visit localhost in your browser to use the app