// Import everything we'll need for the rest of the tutorial
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { decodeSuiPrivateKey } from '@mysten/sui.js/cryptography';
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { 
  GasStationClient, 
  createSuiClient, 
  buildGaslessTransactionBytes 
} from "@shinami/clients";

// Copy your Testnet Gas Station and Node Service key value
const GAS_AND_NODE_TESTNET_ACCESS_KEY = "{{gasAndNodeServiceTestnetAccessKey}}";

// Set up your Gas Station and Node Service clients
const nodeClient = createSuiClient(GAS_AND_NODE_TESTNET_ACCESS_KEY);
const gasStationClient = new GasStationClient(GAS_AND_NODE_TESTNET_ACCESS_KEY);

// Create a KeyPair to act as the sender
async function generateSecretKey() : Promise<string> {
  let keyPair = new Ed25519Keypair();
  console.log("secretKey:", keyPair.getSecretKey())
  return keyPair.getSecretKey();
}
let ENCODED_SECRET_KEY = await generateSecretKey(); // replace the function call with the key printed to the console

const { schema, secretKey } = decodeSuiPrivateKey(ENCODED_SECRET_KEY); // we'll ignore the schema since we know it's an Ed25519Keypair
const keyPairFromSecretKey = Ed25519Keypair.fromSecretKey(secretKey);
const SENDER_ADDRESS = keyPairFromSecretKey.toSuiAddress();
console.log("sender address:", SENDER_ADDRESS);


// Generate the TransactionKind for sponsorship as a Base64 encoded string
// let gaslessPayloadBase64 = await clockMoveCallTransactionKind();

// Sponsor, sign, and execute the transaction
// let txDigest = await sponsorAndExecuteTransactionForKeyPairSender(
//                          gaslessPayloadBase64, keyPairFromSecretKey);
// console.log("Transaction Digest:", txDigest);


//
// Builds a Move call for sponsorship in one step using our SDK helper function
//
async function clockMoveCallTransactionKind() : Promise<string> {
  let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
    sui: nodeClient,
    build: async (txb) => {
      txb.moveCall({
        target: "0xfa0e78030bd16672174c2d6cc4cd5d1d1423d03c28a74909b2a148eda8bcca16::clock::access",
        arguments: [txb.object('0x6')]
      });
    }
  });
  console.log("\nbuildGaslessTransactionBytes response (your TransactionKind for sponsorship):");
  console.log(gaslessPayloadBase64);

  return gaslessPayloadBase64
}

//
// Sponsors, signs, and executes a transaction for a Ed25519Keypair (sender) 
// Returns the transaction digest of the excuted transaction.
//
async function sponsorAndExecuteTransactionForKeyPairSender(
  transactionKindBase64: string, keypair: Ed25519Keypair): Promise<string> {

  //  Send the TransactionKind to Shinami Gas Station for sponsorship.
  //  We are omitting the gasBudget parameter to take advantage of auto-budgeting.
  let sponsoredResponse = await gasStationClient.sponsorTransactionBlock(
    transactionKindBase64,
    keypair.toSuiAddress() // sender address
  );
  console.log("\nsponsorTransactionBlock response:");
  console.log(sponsoredResponse);

  // Sign the full transaction payload with the sender's key.
  let senderSig = await TransactionBlock.from(sponsoredResponse?.txBytes).sign(
    { signer: keyPairFromSecretKey }
  );
  console.log("\nTransactionBlock.sign() response with the sender signature:");
  console.log(senderSig);

  // Send the full transaction payload, along with the gas owner 
  // and sender signatures for execution on the Sui network
  let executeResponse = await nodeClient.executeTransactionBlock({
    transactionBlock: sponsoredResponse?.txBytes,
    signature: [senderSig?.signature, sponsoredResponse?.signature],
    requestType: "WaitForEffectsCert" 
    // or use  "WaitForLocalExecution" if you need read-after-write 
    // consistency for an immediate read after the transaction
  });

  return executeResponse.digest;
}


//
//
// -- Check a fund's balance and deposit more SUI in the fund if it's low -- //
//
//
let { balance, depositAddress }  = await gasStationClient.getFund();
const MIN_FUND_BALANCE_MIST = 50_000_000_000; // 50 SUI
// Deposit address can be null - see our FAQ for how to generate an address
if (depositAddress && balance < MIN_FUND_BALANCE_MIST) {
    // console.log("\nGetting ready to deposit to Gas Station fund address:", depositAddress);
    // let suiCoinObjectIdToDeposit = "{{coinObjectID}}";
    // // We're not actually checking it's a SUI coin we're transferring, which you should do
    // let txKindB64String = await transferObjectToRecipientTransactionKind(suiCoinObjectIdToDeposit, depositAddress);
    // // We're sponsoring with the gas fund we're depositing to (which only work if there's a little SUI left)
    // let txDigest = await sponsorAndExecuteTransactionForKeyPairSender(txKindB64String, keyPairFromSecretKey);
    // console.log("Transaction Digest from fund deposit:", txDigest);
}



//
//
// -- Other TransactionBlock examples  -- //
//
//

//  Create two new small coins by taking MIST from a larger one.
//    and transfering them to the larger coin's owner.
async function splitCoinOwnedByTransactionKind(coinToSplitID: string, ownerAddress: string) : Promise<string> {
  let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
    sui: nodeClient,
    build: async (txb) => {
      const [coin1, coin2] = txb.splitCoins(txb.object(coinToSplitID), [
        txb.pure(100),
        txb.pure(100),
      ]);
      // each new object created in a transaction must be sent to an owner
      txb.transferObjects([coin1, coin2], txb.pure(ownerAddress));
    }
  });

  return gaslessPayloadBase64;
}

//  Transfer one or more object(s) owned by the sender address to the recipient
//    An easy example is a small coin you created with the above transaction.
async function transferObjectToRecipientTransactionKind(objectID: string, recipientAddress: string) : Promise<string> {
  let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
    sui: nodeClient,
    build: async (txb) => {
      txb.transferObjects(
        [txb.object(objectID)],
        txb.pure(recipientAddress)
      );
    }
  });
  return gaslessPayloadBase64;
}

//  Merge one coin (or more) into another, destroying the 
//   small coin(s) and increasing the value of the large one.
async function mergeCoinsTransactionKind(targetCoinID: string, coinToMergeID: string) : Promise<string> {
  let gaslessPayloadBase64 = await buildGaslessTransactionBytes({
    sui: nodeClient,
    build: async (txb) => {
      txb.mergeCoins(txb.object(targetCoinID), [txb.object(coinToMergeID)]);
    }
  });
  return gaslessPayloadBase64;
}


//
// Builds a Move call for sponsorship in multiple steps
//
async function clockMoveCallTransactionKindAlternateVersion() : Promise<string> {
  let txb = new TransactionBlock();
  txb.moveCall({
    target: "0xfa0e78030bd16672174c2d6cc4cd5d1d1423d03c28a74909b2a148eda8bcca16::clock::access",
    arguments: [txb.object('0x6')]
  });

  // generate the bcs serialized transaction data without any gas object data
  const gaslessPayloadBytes = await txb.build({ client: nodeClient, onlyTransactionKind: true});

  // convert the byte array to a base64 encoded string
  const gaslessPayloadBase64 = btoa(
      gaslessPayloadBytes
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  console.log("\ngaslessPayloadBase64 (your TransactionKind for sponsorship):");
  console.log(gaslessPayloadBase64);

  return gaslessPayloadBase64
}


//
//
// Check the status of a sponsorship
//
// This partial code snippet uses the gaslessPayloadBase64 and SENDER_ADDRESS values from above
//

// let sponsorship = await gasStationClient.sponsorTransactionBlock(
//   gaslessPayloadBase64,
//   SENDER_ADDRESS
// );

// let sponsorshipStatus = await gasStationClient.getSponsoredTransactionBlockStatus(
//   sponsorship.txDigest
// );
// console.log("Sponsorship Status:", sponsorshipStatus);
