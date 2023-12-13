// 1. Import everything we'll need for the rest of the tutorial
import { 
  WalletClient, 
  KeyClient, 
  createSuiClient, 
  GasStationClient,
  buildGaslessTransactionBytes, 
  ShinamiWalletSigner
} from "@shinami/clients";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { verifyPersonalMessage } from '@mysten/sui.js/verify';

// 2. Copy your access key value
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}";

// 3. Set up a wallet id and an associated sercret
const WALLET_ONE_ID = "{{walletOneId}}";
const WALLET_ONE_SECRET = "{{walletOneSecret}}";


// 4. Instantiate your Shinami clients
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const nodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// 5. Set up a variable we'll use in the examples below
let senderSignature = null;

// 6. Generate a signer for our invisible wallet and try to create it
const signer = new ShinamiWalletSigner(
  WALLET_ONE_ID,
  walletClient,
  WALLET_ONE_SECRET,
  keyClient
);

// 7. Returns the Sui address of the invisible wallet, 
//     creating it if it hasn't been created yet
let WALLET_ONE_SUI_ADDRESS = await signer.getAddress(true);
console.log("Invisible wallet Sui address:", WALLET_ONE_SUI_ADDRESS);


// 8. Generate the TransactionKind for sponsorship as a Base64 encoded string
let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
sui: nodeClient,
build: async (txb) => {
  txb.moveCall({
    target: "0xfa0e78030bd16672174c2d6cc4cd5d1d1423d03c28a74909b2a148eda8bcca16::clock::access",
    arguments: [txb.object('0x6')]
  });
}
});


// 9. Sponsor, sign, and execute the transaction
//    We are omitting the gasBudget parameter to take advantage of auto-budgeting.
const sponsorSignAndExecuteResponse = await signer.executeGaslessTransactionBlock(
  gaslessPayloadBase64,
  undefined,
  { showEffects: true },
  "WaitForLocalExecution"
)

// You can look up the digest in Sui Explorer - make sure to switch to Testnet
console.log("sponsorSignAndExecuteResponse.digest:", sponsorSignAndExecuteResponse.digest);




// -- Sponsor, sign, and execute a transaction in three calls -- //

// Sponsor the above transaction with a call to Gas Station
const gasStationClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY); 
const sponsoredResponse = await gasStationClient.sponsorTransactionBlock(
  gaslessPayloadBase64,
  WALLET_ONE_SUI_ADDRESS
);

// Sign the transaction (the Invisible Wallet is the sender)
senderSignature = await signer.signTransactionBlock(
  sponsoredResponse.txBytes
);

// Use the TransactionBlock and sponsor signature produced by 
//  `sponsorTransactionBlock` along with the sender's signature we 
//  just obtained to execute the transaction.
const executeSponsoredTxResponse = await nodeClient.executeTransactionBlock({
  transactionBlock: sponsoredResponse.txBytes,
  signature: [senderSignature.signature, sponsoredResponse.signature],
  options: { showEffects: true },
  requestType: "WaitForLocalExecution",
});

console.log("executeSponsoredTxResponse.digest: ", executeSponsoredTxResponse.digest);



// -- Sign and execute a non-sponsored transaction -- //

// You can send Testnet Sui to your wallet address 
//  via the Sui Discord Testnet faucet

// 
//  Un-comment the below section and set the object id of COIN_TO_SPLIT
// 

// // Set this to the id of a Sui coin owned by the sender address
// const COIN_TO_SPLIT = "{{coinToSplitObjectId}}";

// // Create  new TransactionBlock and add the operations to create
// //  two new coins from MIST contained by the COIN_TO_SPLIT
// const txb = new TransactionBlock();
// const [coin1, coin2] = txb.splitCoins(txb.object(COIN_TO_SPLIT), [
//   txb.pure(10000),
//   txb.pure(20000),
// ]);
//   // Each new object created in a transaction must be sent to an owner
// txb.transferObjects([coin1, coin2], txb.pure(WALLET_ONE_SUI_ADDRESS));
//   // Set gas context and sender
// txb.setSender(WALLET_ONE_SUI_ADDRESS);
// txb.setGasBudget(GAS_BUDGET);
// txb.setGasOwner(WALLET_ONE_SUI_ADDRESS);


// // Generate the bcs serialized transaction data without any gas object data
// const txBytes = await txb.build({ client: nodeClient, onlyTransactionKind: false});

// // Convert the byte array to a base64 encoded string
// const txBytesBase64 = btoa(
//   txBytes
//       .reduce((data, byte) => data + String.fromCharCode(byte), '')
// );

// // Sign the transaction (the Invisible Wallet is the sender)
// senderSignature = await signer.signTransactionBlock(
//   txBytesBase64
// );

// // Execute the transaction 
// const executeNonSponsoredTxResponse = await nodeClient.executeTransactionBlock({
//   transactionBlock: txBytesBase64,
//   signature: [senderSignature.signature],
//   options: { showEffects: true },
//   requestType: "WaitForLocalExecution",
// });

// console.log("executeNonSponsoredTxResponse.digest:", executeNonSponsoredTxResponse.digest);

//
// End section to uncomment
//


//  -- Sign a personal message from an invisible wallet and then verify the signer -- //

// Encode the as a base64 string
let message = "I have the private keys."; 
let messageAsBase64String = btoa(message);

// Sign the message with the Invisible Wallet
let signature = await signer.signPersonalMessage(
  messageAsBase64String
);

// When we check the signature, we encode the message as a byte array
// and not a base64 string like when we signed it
let messageBytes = new TextEncoder().encode(message); 

// Failure throws a `Signature is not valid for the provided message` Error
let publicKey = await verifyPersonalMessage(messageBytes, signature);

// Check that the signer's address matches the Invisible wallet's address
console.log("Personal message signer address matches Invisible Wallet address:", WALLET_ONE_SUI_ADDRESS == publicKey.toSuiAddress());
// true
