# Code examples (TypeScript)
Examples to show you how to use Shinami's Gas Station and Wallet Services APIs. Accompanying tutorials can be found on [our docs website](https://docs.shinami.com/docs/guides-overview#integrate-a-product) and are linked below. 

## Gas Station (transaction gas fee sponsorship)
- [Tutorial](https://docs.shinami.com/docs/sponsored-transaction-typescript-tutorial)
- `src/gas_station.ts`: shows you how to sponsor transactions and check your Gas Station fund balance.

## Invisible Wallets (embedded NFT wallets for Web2-native users)
- [Tutorial](https://docs.shinami.com/docs/invisible-wallet-typescript-tutorial)
- `src/invisible_wallet.ts`: shows you how to create a wallet and submit a transaction where it's the sender.

## Node Service read after write consistency example
- [Guide](https://docs.shinami.com/docs/sui-requests-and-transactions-faq#how-do-i-get-read-after-write-consistency)
- `src/read_after_write_consistency.ts`: shows you how to poll a Full-node to wait for it to have the results of a transaction