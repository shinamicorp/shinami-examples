# Shinami Sponsored Transaction example with zkLogin and Passkey
This is a simple example showing how to combine Gas Station backend sponsorship with a frontend that collects transaction input from the user. We provide this example because our Gas Station does not support CORS (browser) requests for security reasons, so you need to pair backend Gas Station requests with your browser-based frontend. 

It's not meant as a starter template for a production app. It's just a bare-bones examle that shows how to:
1. FE: Log a user into their zkLogin wallet / create and recover a Passkey wallet 
2. FE: Collect user input that will be used to build a Move call transaction and send that data to the backend.
3. BE: Construct a gasless transaction using the data.
4. FE: Sign the transaction on the frontend
5. BE: Submit the transaction on the backend (you could also submit on the FE here)
6. FE: Poll a Sui Full node for information about the transaction digest returned from the backend. Upon successful response from the Full node, update the page state with the result of the Move call.



# Setup and running the app
1. Run `npm install` to install the dependencies
2. Run `cp .env .env.local` to create a local file for your environmental variables (so it won't be committed to github)
3. In your .env.local file, uncomment and set values for ALL_SERVICES_TESTNET_ACCESS_KEY (a backend-only key (as it talks to Shinami Gas Station and Wallet Services), VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY (a frontend key that talks to Shinami Node Service), and VITE_GOOGLE_CLIENT_ID (the id for your Google Oauth application). Save the changes.
4. Run `npm run dev` to run the server.  
5. Visit [localhost](http://localhost:3000/) in your browser to use the app.

