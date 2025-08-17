# Shinami Sponsored Transaction examples with Aptos Keyless
This is a simple example of combining Shinami Gas Station sponsorship on the backend with frontend signing using an Aptos Keyless wallet tied to your application. The code for creating and storing Keyless accounts on the frontend is taken from the [Aptos Keyless Integration Guide](https://aptos.dev/en/build/guides/aptos-keyless/integration-guide). So, we recommend you start there first if you aren't familiar with integrating Keyless wallets into your application. 

This code is not meant as a template for a production app, but instead as a quick way to show you how you can pass the relevant types between the frontend and backend in order to combine backend sponsorship with frontend signing from a KeylessAccount.

# Setup and running the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, uncomment and set the value for GAS_STATION_PLUS_NODE_TESTNET_ACCESS_KEY: your Shinami API access key with rights to Gas Station and Node Service (which you create in your Shinami dashboard: https://app.shinami.com/access-keys)
4. In your .env.local file, uncomment and set the value for VITE_GOOGLE_CLIENT_ID to your Google OAauth client app id.
5. In your .env.local file, uncomment and set the value for VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY: your Shinami API access key with rights to Node Service. This is a publicly visible key, which you can protect with a domain allowlist in a production app.
5. Run `npm run dev` to run the server.  
6. Visit [localhost](http://localhost:3000/) in your browser to use the app.



For a Keyless wallet transaction, you will always sign on the frontend and sponsor on the backend. To use a different flow for where the transaction is built and where it is submitted, though, you can comment in and out the function you want` in `src/client/pages/TransactionPage.tsx`, e.g.:

                    pendingTxResponse =
                        //await keylessTxBEBuildFESubmit(message, keylessAccount);
                        await keylessTxFEBuildBESubmit(message, keylessAccount);