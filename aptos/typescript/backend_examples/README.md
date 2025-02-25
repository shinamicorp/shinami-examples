# Code examples (TypeScript)
Examples to show you how to use Shinami's Gas Station and Wallet Services APIs. Accompanying tutorials can be found on [our docs website](https://docs.shinami.com/docs/guides-overview#integrate-a-product) and are linked below. 

## Gas Station (feePayer transaction gas fee sponsorship)
- [Tutorial](https://docs.shinami.com/docs/aptos-gas-station-tutorial-typescript)
- `src/gas_station.ts`: shows you how to sponsor feePayer transactions and check your Gas Station fund balance.
- `move/sources/unfair_swap_coins.move`: a Move script you can optionally compile and use to sponsor a multi-agent feePayer transaction. Learn how in the Gas Station tutorial.

## Invisible Wallets (embedded NFT wallets for Web2-native users)
- [Tutorial](https://docs.shinami.com/docs/aptos-invisible-wallets-tutorial-typescript)
- `src/invisible_wallet.ts`: shows you how to create a wallet and submit a transaction where it's the sender.