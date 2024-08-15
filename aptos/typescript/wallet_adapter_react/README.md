# Shinami Sponsored Transaction examples with @aptos-labs/wallet-adapter-react
This is a simple example of combining Shinami Gas Station sponsorship on the backend with frontend signing via @aptos-labs/wallet-adapter-react. It also includes a backend Shinami Invisible Wallet sender example that runs when there is no connected wallet. This code is not meant as a template for a production app, but instead as a quick way to show you how you can pass the relevant types between the frontend and backend.

# Setup and running the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, set the values for your Shinami access key, as well as a walletId and walletSecret for creating a Shinami Invisible Wallet. 
4. Run `npm run dev` to run the server.  
5. Visit [localhost](http://localhost:3000/) in your browser to use the app.