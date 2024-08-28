# Shinami Sponsored Transaction examples with @aptos-labs/wallet-adapter-react
This is a simple example of combining Shinami Gas Station sponsorship on the backend with frontend signing using [Aptos Keyless](https://aptos.dev/en/build/guides/aptos-keyless/introduction). This code is not meant as a template for a production app, but instead as a quick way to show you how you can pass the relevant types between the frontend and backend.

# Setup and running the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, uncomment and set the value for ALL_SERVICES_TESTNET_ACCESS_KEY: your Shinami API access key with rights to Gas Station and Wallet Services (which you create in your Shinami dashboard: https://app.shinami.com/access-keys)
4. In your .env.local file, uncomment and set the value for REACT_APP_GOOGLE_CLIENT_ID to your Google OAauthclient app id.
5. Run `npm run dev` to run the server.  
6. Visit [localhost](http://localhost:3000/) in your browser to use the app.