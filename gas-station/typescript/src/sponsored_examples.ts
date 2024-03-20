// 1. Import everything we'll need for the rest of the tutorial
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { GasStationClient, createSuiClient, buildGaslessTransactionBytes } from "@shinami/clients";

// 2. Copy your Testnet Gas Station and Node Service key value
const GAS_AND_NODE_TESTNET_ACCESS_KEY = "{{gasAndNodeServiceTestnetAccessKey}}";

// 3. Set up your Gas Station and Node Service clients
const nodeClient = createSuiClient(GAS_AND_NODE_TESTNET_ACCESS_KEY);
const gasStationClient = new GasStationClient(GAS_AND_NODE_TESTNET_ACCESS_KEY);

// 4. Generate a new KeyPair to represent the sender
let keyPair = new Ed25519Keypair();
const SENDER_ADDRESS = keyPair.toSuiAddress();

// 5. Generate the TransactionKind for sponsorship as a Base64 encoded string
let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
  sui: nodeClient,
  build: async (txb) => {
    txb.moveCall({
      target: "0xfa0e78030bd16672174c2d6cc4cd5d1d1423d03c28a74909b2a148eda8bcca16::clock::access",
      arguments: [txb.object('0x6')]
    });
  }
});

// 6. Send the TransactionKind to Shinami Gas Station for sponsorship.
//     We are omitting the gasBudget parameter to take advantage of auto-budgeting.
let sponsoredResponse = await gasStationClient.sponsorTransactionBlock(
  gaslessPayloadBase64,
  SENDER_ADDRESS
);

// 7. The transaction should be sponsored as long as there was SUI 
//     in your fund, so its status will be "IN_FLIGHT"
let sponsoredStatus = await gasStationClient.getSponsoredTransactionBlockStatus(
  sponsoredResponse.txDigest
);
console.log("Transaction Digest:", sponsoredResponse.txDigest);
console.log("Sponsorship Status:", sponsoredStatus);

// 8. Sign the full transaction payload with the sender's key.
let senderSig = await TransactionBlock.from(sponsoredResponse.txBytes).sign({ signer: keyPair });

// 9. Send the full transaction payload, along with the gas owner 
//     and sender's signatures for execution on the Sui network
let executeResponse = await nodeClient.executeTransactionBlock({
  transactionBlock: sponsoredResponse.txBytes,
  signature: [senderSig.signature, sponsoredResponse.signature],
  options: { showEffects: true },
  requestType: "WaitForLocalExecution",
});

console.log("Transaction Digest:", executeResponse.digest);
console.log("Execution Status:", executeResponse.effects?.status.status);



// -- Check a fund's balance and deposit more SUI in the fund if it's low -- //

// let suiCoin = "{{coinObjectId}}";
// let coinsToDeposit = [suiCoin];
// const SUI_COIN_OWNER_ADDRESS = "{{address}}";
// const MIN_BUDGET_MIST = 100_000_000_000;

// let { balance, depositAddress }  = await gasStationClient.getFund();

// // Deposit address can be null - see our FAQ for how to generate an address
// if (depositAddress && balance < MIN_BUDGET_MIST) {
//     let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
//       sui: nodeClient,
//       build: async (txb) => {
//         txb.transferObjects(
//           coinsToDeposit,
//           txb.pure(depositAddress)
//         );
//       }
//     });

//     let sponsoredResponse = await gasStationClient.sponsorTransactionBlock(
//       gaslessPayloadBase64,
//       SUI_COIN_OWNER_ADDRESS
//     );

//     console.log("getting ready to deposit to", depositAddress);

//     // Finally, you would:
//     //   1. Get the signature from the SUI_COIN_OWNER_ADDRESS, who is the sender 
//     //   2. Execute the transaction like above

//   }



// -- Other TransactionBlock examples  -- //

//  Create two new small coins by taking MIST from a larger one.
//    If you ask for testnet Sui for an account you have the 
//    private key or passphrase to, you can split two coins from that.
//
//
// const COIN_TO_SPLIT = "{{coinObjectId}}";
// let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
//   sui: nodeClient,
//   build: async (txb) => {
//     const [coin1, coin2] = txb.splitCoins(txb.object(COIN_TO_SPLIT), [
//       txb.pure(10000),
//       txb.pure(20000),
//     ]);
//     // each new object created in a transaction must be sent to an owner
//     txb.transferObjects([coin1, coin2], txb.pure(SENDER_ADDRESS));
//   }
// });


//  Transfer one or more object(s) owned by the sender address to the recipient
//    An easy example is a small coin you created with the above transaction.
//
//
// const RECIPIENT_ADDRESS = "{{recipientSuiAddress}}";
// const OBJECT_TO_SEND = "{{objectId}}";
// let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
//   sui: nodeClient,
//   build: async (txb) => {
//     txb.transferObjects(
//       [txb.object(OBJECT_TO_SEND)],
//       txb.pure(RECIPIENT_ADDRESS)
//     );
//   }
// });


//  Merge one or more smaller coins into another, destroying the small coin(s)
//    and increasing the value of the large one.
//
//
// const TARGET_COIN = "{{targetCoin}}";
// const COIN_SOURCE1 = "{{coinSource1}}";
// const COIN_SOURCE2 = "{{coinSource2}}";
// let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
//   sui: nodeClient,
//   build: async (txb) => {
//     txb.mergeCoins(txb.object(TARGET_COIN), [
//       txb.object(COIN_SOURCE1),
//       txb.object(COIN_SOURCE2),
//     ]);
//   }
// });



// -- Generate a KeyPair from a private key or passphrase -- //

// // Create the sender's KeyPair from the private key
// const SENDER_PRIVATE_KEY = "{{privateKey}}";
// const buf = Buffer.from(SENDER_PRIVATE_KEY, "base64");
// const keyPairFromSecretKey = Ed25519Keypair.fromSecretKey(buf.slice(1));
// console.log(keyPairFromSecretKey.toSuiAddress());


// // Create the sender's KeyPair from the recovery phrase
// const SENDER_PASSPHRASE = "{{passphrase}}";
// const keyPairFromPassphrase = Ed25519Keypair.deriveKeypair(SENDER_PASSPHRASE);
// console.log(keyPairFromPassphrase.toSuiAddress());