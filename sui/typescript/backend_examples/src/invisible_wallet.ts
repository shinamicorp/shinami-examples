// 1. Import everything we'll need for the rest of the tutorial
import {
  WalletClient,
  KeyClient,
  createSuiClient,
  GasStationClient,
  buildGaslessTransaction,
  ShinamiWalletSigner,
  GaslessTransaction
} from "@shinami/clients/sui";
import { Transaction } from "@mysten/sui/transactions";
import { verifyPersonalMessageSignature } from '@mysten/sui/verify';

// 2. Copy your access key value
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}";

// 3. Set up a wallet id and an associated secret
const WALLET_ONE_ID = "{{walletOneId}}";
const WALLET_ONE_SECRET = "{{walletOneSecret}}";

// 4. Instantiate your Shinami clients
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const nodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// 5. Create a signer for the Invisible Wallet
const signer = new ShinamiWalletSigner(
  WALLET_ONE_ID,
  walletClient,
  WALLET_ONE_SECRET,
  keyClient
);

// 6. Create the wallet. This request returns the Sui address of an 
//     Invisible Wallet, creating it if it hasn't been created yet
const CREATE_WALLET_IF_NOT_FOUND = true;
const WALLET_ONE_SUI_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);
console.log("Invisible wallet Sui address:", WALLET_ONE_SUI_ADDRESS);

// 7. Generate a GaslessTransaction for sponsorship 
const gaslessTx = await buildGaslessTransaction(
  await clockMoveCallTransaction(),
  { sui: nodeClient }
);

// 8. Choose a sample code method to run
const txDigest = await
  sponsorSignExecuteInOneRequest(signer, gaslessTx);
// sponsorSignExecuteInThreeRequests(signer, gaslessTx);

const txInfo = await nodeClient.waitForTransaction({
  digest: txDigest,
  options: { showEffects: true }
});

// You can look up the digest in a Sui explorer - make sure to switch to Testnet
console.log("\ntxDigest: ", txDigest);
console.log("status:", txInfo.effects?.status.status);


// 9. (optional) Uncomment th enext line to sign a personal message with 
//      the Invisible Wallet and then verify that the wallet signed it.
// await signAndVerifyPersonalMessage(signer);



//  Use The Invisible Wallet API's method to do all the sponsor, sign, and execute 
//   transaction steps with one call. Returns the associated transaction digest if successful.
async function sponsorSignExecuteInOneRequest(signer: ShinamiWalletSigner,
  gaslessTx: GaslessTransaction): Promise<string> {
  const sponsorSignAndExecuteResponse = await signer.executeGaslessTransaction(
    gaslessTx, // by not setting gaslessTx.gasBudget we take advantage of Shinami auto-budgeting
  )
  return sponsorSignAndExecuteResponse.digest;
}


//
//  Sponsor, sign, and execute a transaction in three requests. More work, but allows
//   for more control and flexibility over the process when needed.
//   Returns the associated transaction digest if successful.
async function sponsorSignExecuteInThreeRequests(signer: ShinamiWalletSigner,
  gaslessTx: GaslessTransaction): Promise<string> {

  // 1. Sponsor the GaslessTransaction with a call to Gas Station
  const gasStationClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
  gaslessTx.sender = await signer.getAddress();
  const sponsoredResponse = await gasStationClient.sponsorTransaction(
    gaslessTx // by not setting gaslessTx.gasBudget we take advantage of Shinami auto-budgeting
  );

  // 2. Sign the transaction (the Invisible Wallet is the sender)
  const senderSignature = await signer.signTransaction(
    sponsoredResponse.txBytes
  );

  // 3. Use the transaction bytes and sponsor signature produced by 
  //  `sponsorTransactionBlock` along with the sender's signature 
  const executeSponsoredTxResponse = await nodeClient.executeTransactionBlock({
    transactionBlock: sponsoredResponse.txBytes,
    signature: [senderSignature.signature, sponsoredResponse.signature]
  });
  return executeSponsoredTxResponse.digest;
}



// Generate a Transaction already populated with a Move call.
//  This calls a module we've deployed to Testnet.
async function clockMoveCallTransaction(): Promise<Transaction> {
  const tx = new Transaction();
  tx.moveCall({
    target: "0xfa0e78030bd16672174c2d6cc4cd5d1d1423d03c28a74909b2a148eda8bcca16::clock::access",
    arguments: [tx.object('0x6')]
  });
  return tx;
}



//
//  Sign a personal message from an Invisible Wallet and then verify the signer. 
//   Returns a boolean representing whether or not the test was successful.
async function signAndVerifyPersonalMessage(signer: ShinamiWalletSigner): Promise<boolean> {

  // 1. Encode the message as a Base64 string
  const message = "I control the private key, haha!";
  const messageAsBase64String = btoa(message);

  // 2. Sign the message with the Invisible Wallet private key
  const signature = await signer.signPersonalMessage(
    messageAsBase64String
  );

  // 3. When we check the signature, we encode the message as a byte array
  // and not a Base64 string like when we signed it
  const messageBytes = new TextEncoder().encode(message);

  // 4. Determine whether the signature is valid for the messsage. 
  //    Failure throws an Error with message: `Signature is not valid for the provided message`.
  //    Returns the public key associated with the signature.
  const publicKey = await verifyPersonalMessageSignature(messageBytes, signature);

  // 5. Check whether the signer's address matches the Invisible Wallet's address
  if (publicKey.toSuiAddress() !== await signer.getAddress()) {
    console.log("\nSignature valid for message, but was signed by a different key pair, :(");
    return false;
  } else {
    console.log("\nSignature was valid and signed by the Invisible Wallet!");
    return true;
  }
}
