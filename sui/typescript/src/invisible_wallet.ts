// 1. Import everything we'll need for the rest of the tutorial
import { 
  WalletClient, 
  KeyClient, 
  createSuiClient, 
  GasStationClient,
  buildGaslessTransactionBytes, 
  ShinamiWalletSigner
} from "@shinami/clients/sui";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { verifyPersonalMessage } from '@mysten/sui.js/verify';

// 2. Copy your access key value
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}";

// 3. Set up a wallet id and an associated secret
const WALLET_ONE_ID = "{{walletOneId}}";
const WALLET_ONE_SECRET = "{{walletOneSecret}}";


// 4. Instantiate your Shinami clients
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const nodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// 5. Set up a variable we'll use in two examples below
let senderSignature = null;

// 6. Create a signer for the Invisible Wallet
const signer = new ShinamiWalletSigner(
  WALLET_ONE_ID,
  walletClient,
  WALLET_ONE_SECRET,
  keyClient
);

// 7. Create the wallet. This request returns the Sui address of an 
//     Invisible Wallet, creating it if it hasn't been created yet
const CREATE_WALLET_IF_NOT_FOUND = true;
let WALLET_ONE_SUI_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);
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
  undefined, // setting gasBudget to undefined triggers our auto-budgeting feature
  { showEffects: true },
  "WaitForLocalExecution"
)
// You can look up the digest in a Sui explorer - make sure to switch to Testnet
console.log("\nSign, sponsor, execute in one request.\ndigest: ", sponsorSignAndExecuteResponse.digest);
console.log("status:", sponsorSignAndExecuteResponse.effects?.status.status);


//
// -- ADDITIONAL WALLET OPERATIONS BELOW -- //
//

// Perform the above sponsorship in three requests instead of one
let txDigest = await signSponsorExecuteInThreeRequests(signer, gaslessPayloadBase64);

// Sign and execute a non-sponsored transaction. 
//  This requires two SUI coins in the address of the signer - one to split and one for gas. 
//   You can use the Sui discord Testnet faucet channel, the faucet in Sui Wallet, etc.
//
// const COIN_TO_SPLIT_ID = "{{coinToSplitObjectId}}"; // Set this to the id of a SUI coin owned by the sender address
// let unsponsoredDigest = await signAndExecuteANonSponsoredTransaction(signer, COIN_TO_SPLIT_ID);

// Sign a personal message with the Invisible Wallet and verify that the wallet signed it.
let wasSuccessful = await signAndVerifyPersonalMessage(signer);



//
//  Sponsor, sign, and execute a transaction in three requests.
//  Returns the associated transaction digest if successful.
async function signSponsorExecuteInThreeRequests(signer: ShinamiWalletSigner, transactionKind: string) : Promise<string> {

  // Sponsor the TransactionKind with a call to Gas Station
  const gasStationClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY); 
  const sponsoredResponse = await gasStationClient.sponsorTransactionBlock(
    transactionKind,
    WALLET_ONE_SUI_ADDRESS
  );

  // Sign the transaction (the Invisible Wallet is the sender)
  senderSignature = await signer.signTransactionBlock(
    sponsoredResponse.txBytes
  );

  // Use the TransactionBlock and sponsor signature produced by 
  //  `sponsorTransactionBlock` along with the sender's signature 
  const executeSponsoredTxResponse = await nodeClient.executeTransactionBlock({
    transactionBlock: sponsoredResponse.txBytes,
    signature: [senderSignature.signature, sponsoredResponse.signature],
    options: { showEffects: true },
    requestType: "WaitForLocalExecution",
  });
  console.log("\nSign, sponsor, execute in three requests.\ndigest: ", executeSponsoredTxResponse.digest);
  console.log("status:", executeSponsoredTxResponse.effects?.status.status);

  return executeSponsoredTxResponse.digest;
}



//
//  Sign and execute a non-sponsored transaction.
//  Returns the associated transaction digest if successful.
async function signAndExecuteANonSponsoredTransaction(signer: ShinamiWalletSigner, coinToSplitID: string) : Promise<string> {

  const GAS_BUDGET = 10_000_000; // 10 Million MIST, or 0.01 SUI

  // Create a new TransactionBlock and add the operations to create
  //  two new coins from MIST contained by the COIN_TO_SPLIT
  const txb = new TransactionBlock();
  const [coin1, coin2] = txb.splitCoins(txb.object(coinToSplitID), [
    txb.pure(10000),
    txb.pure(20000),
  ]);
    // Each new object created in a transaction must be sent to an owner
  txb.transferObjects([coin1, coin2], txb.pure(WALLET_ONE_SUI_ADDRESS));
    // Set gas context and sender
  txb.setSender(WALLET_ONE_SUI_ADDRESS);
  txb.setGasBudget(GAS_BUDGET);
  txb.setGasOwner(WALLET_ONE_SUI_ADDRESS);

  // Generate the BCS serialized transaction data WITH gas data by setting onlyTransactionKind to false
  const txBytes = await txb.build({ client: nodeClient, onlyTransactionKind: false});

  // Convert the byte array to a Base64 encoded string
  const txBytesBase64 = btoa(
    txBytes
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );

  // Sign the transaction (the Invisible Wallet is the sender)
  senderSignature = await signer.signTransactionBlock(
    txBytesBase64
  );

  // Execute the transaction 
  const executeNonSponsoredTxResponse = await nodeClient.executeTransactionBlock({
    transactionBlock: txBytesBase64,
    signature: [senderSignature.signature],
    options: { showEffects: true },
    requestType: "WaitForLocalExecution",
  });

  console.log("\nNon-sponsored Transaction.\ndigest: ", executeNonSponsoredTxResponse.digest);
  console.log("status:", executeNonSponsoredTxResponse.effects?.status.status);
  return executeNonSponsoredTxResponse.digest;
}



//
//  Sign a personal message from an Invisible Wallet and then verify the signer. 
//   Returns a boolean representing whether or not the test was successful.
async function signAndVerifyPersonalMessage(signer: ShinamiWalletSigner) : Promise<boolean> {

  // Encode the as a Base64 string
  let message = "I control the private key."; 
  let messageAsBase64String = btoa(message);

  // Sign the message with the Invisible Wallet
  let signature = await signer.signPersonalMessage(
    messageAsBase64String
  );

  // When we check the signature, we encode the message as a byte array
  // and not a Base64 string like when we signed it
  let messageBytes = new TextEncoder().encode(message); 

  // Failure throws a `Signature is not valid for the provided message` Error
  let publicKey = await verifyPersonalMessage(messageBytes, signature);

  // Check that the signer's address matches the Invisible Wallet's address
  let wasSuccessful = WALLET_ONE_SUI_ADDRESS == publicKey.toSuiAddress();
  console.log("\nPersonal message signer address matches Invisible Wallet address:", wasSuccessful);
  return wasSuccessful;
}
