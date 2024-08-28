# Shinami Sponsored Transaction examples with Aptos Keyless
This is a simple example of combining Shinami Gas Station sponsorship on the backend with frontend signing using an Aptos Keyless wallet tied to your application. The code for creating and storing Keyless accounts on the frontend is taken from the [Aptos Keyless Integration Guide](https://aptos.dev/en/build/guides/aptos-keyless/integration-guide). So, we recommend you start there first if you aren't familiar with integrating Keyless wallets into your application. 

This code is not meant as a template for a production app, but instead as a quick way to show you how you can pass the relevant types between the frontend and backend in order to combine backend sponsorship with frontend signing.

# Setup and running the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, uncomment and set the value for ALL_SERVICES_TESTNET_ACCESS_KEY: your Shinami API access key with rights to Gas Station and Wallet Services (which you create in your Shinami dashboard: https://app.shinami.com/access-keys)
4. In your .env.local file, uncomment and set the value for REACT_APP_GOOGLE_CLIENT_ID to your Google OAauth client app id.
5. Run `npm run dev` to run the server.  
6. Visit [localhost](http://localhost:3000/) in your browser to use the app.