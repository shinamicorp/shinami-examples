# Status: WIP
This is a work in progress branch and not yet meant as a best practice example of using Shinami with @aptos-labs/wallet-adapter-react

# Shinami Sponsored Transaction example with @aptos-labs/wallet-adapter-react
This is a simple example showing how to:
1. Collect user input on the frontend that will be used to build a Move call transaction.
2. Send that data to the backend and construct a feePayer transaction using that data.

and then:

_If there is NOT a connected browser wallet_
3. Sponsor, sign, and execute that transaction in one request with Shinami's Invisible Wallet API.
4. Return the result to the frontend.

_Or, if there IS a connected browser wallet_
3. Sponsor that transaction with Shinami's Gas Station.
4. Return the sponsored transaction and sponsor signature to the frontend.
5. Obtain the sender signature from the user via the connected wallet.
6. Submit the transction with and the sender and feePayer signatures

Finally, on the frontend:
- Poll an Aptos Full node for the transaction digest. Update the page state with the result of the Move call.


# Setup and running the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, set the values for your Shinami access key, as well as a walletId and walletSecret for creating a Shinami Invisible Wallet. 
4. Run `npm run dev` to run the server.  
5. Visit [localhost](http://localhost:3000/) in your browser to use the app.