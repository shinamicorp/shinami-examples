# Code examples (TypeScript)
Examples to show you how to use Shinami's Gas Station and Wallet Services APIs. Accompanying tutorials can be found on [our docs website](https://docs.shinami.com/developer-guides/overview) and are linked below. 

## Gas Station (transaction gas fee sponsorship)
- [Tutorial](https://docs.shinami.com/developer-guides/sui/tutorials/gas-station-backend-only)
- `src/gas_station.ts`: shows you how to sponsor transactions and check your Gas Station fund balance.

## Invisible Wallets (embedded NFT wallets for Web2-native users)
- [Tutorial](https://docs.shinami.com/developer-guides/sui/tutorials/invisible-wallets)
- `src/invisible_wallet.ts`: shows you how to create a wallet and submit a transaction where it's the sender, using Shinami Gas Station for transaction sponsorship.

All node requests use Mysten's free gRPC node. Mysten has a [guide for migrating from JSON-RPC to gRPC](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration) as a part of it's [SDK 2.0 migration guide](https://sdk.mystenlabs.com/sui/migrations/sui-2.0).