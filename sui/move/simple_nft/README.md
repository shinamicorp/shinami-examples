# Simple NFT example
This is a simple example we created and published to Testnet so that our Invisible Wallet sample code can mint an NFT for the example user wallet. You can read a little more about it in our [Invisible Wallet Tutorial](https://docs.shinami.com/docs/invisible-wallet-typescript-tutorial#5-generate-a-gaslesstransaction)

## To publish
1. Make sure your local SUI and CLI versions [are up-to-date](https://docs.sui.io/guides/developer/getting-started/sui-install).
2. Make sure you're using a funded Testnet account with the CLI (See CLI commands [here](https://docs.sui.io/references/cli/client))
3. In this directory, run the following in your terminal: sui move build
4. Once the build process is complete, run: sui client publish --gas-budget 50000000