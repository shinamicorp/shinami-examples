// 1. Import everything we'll need for the rest of the tutorial
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from '@mysten/sui/bcs';
import { 
  GasStationClient, 
  createSuiClient, 
  buildGaslessTransaction,
  GaslessTransaction
} from "@shinami/clients/sui";

// 2. Copy your Testnet Gas Station and Node Service key value
const GAS_AND_NODE_TESTNET_ACCESS_KEY = "{{gasAndNodeServiceTestnetAccessKey}}";

// 3. Set up your Gas Station and Node Service clients
const nodeClient = createSuiClient(GAS_AND_NODE_TESTNET_ACCESS_KEY);
const gasStationClient = new GasStationClient(GAS_AND_NODE_TESTNET_ACCESS_KEY);

// 4. Create a KeyPair to act as the sender
async function generateSecretKey() : Promise<string> {
  const keyPair = new Ed25519Keypair();
  console.log("secretKey:", keyPair.getSecretKey())
  return keyPair.getSecretKey();
}

// After the first run, replace the function call with the private key value printed to the console.
//  This is not a recommendation for production code, just a convenience for the tutorial
//  because some examples require transfering a Testnet coin from the faucet to the sender, so
//  you'll need a fixed sender address. Your app should determine the best way to manage any 
//  keys it controls.
const ENCODED_SECRET_KEY = await generateSecretKey(); 
const { schema, secretKey } = decodeSuiPrivateKey(ENCODED_SECRET_KEY);
const keyPairFromSecretKey = Ed25519Keypair.fromSecretKey(secretKey);
const SENDER_ADDRESS = keyPairFromSecretKey.toSuiAddress();
console.log("sender address:", SENDER_ADDRESS);

// Values for some of the commented out function calls.
// Objects must be owned by the sender controlled by the KeyPair.
const SUI_COIN_TO_DEPOSIT_ID = "{{SUIcoinObjectID}}";
const COIN_TO_SPLIT_FROM_ID = "{{SUIcoinObjectID}}";
const COIN_TO_MERGE_ID =  "{{SUIcoinObjectID}}";
const OBJ_ID_TO_TRANSFER = "{{objId}}";
const RECIPIENT_ADDRESS = "{{SuiAddress}}";


// 5. Generate the GaslessTransaction for sponsorship 
const gaslessTx =  await
  clockMoveCallGaslessTransaction();
  // clockMoveCallGaslessTransactionAlternateVersion();
  // checkFundBalanceAndDepositIfNeeded(SUI_COIN_TO_DEPOSIT_ID);
  // splitCoinOwnedByGaslessTransaction(COIN_TO_SPLIT_FROM_ID, SENDER_ADDRESS);
  // mergeCoinsGaslessTransaction(COIN_TO_SPLIT_FROM_ID, COIN_TO_MERGE_ID);
  // transferObjectToRecipientGaslessTransaction(OBJ_ID_TO_TRANSFER, RECIPIENT_ADDRESS);

if (gaslessTx) {
  gaslessTx.sender = SENDER_ADDRESS;

  // 6. Sponsor, sign, and execute the transaction
  const txDigest = await sponsorAndExecuteTransactionForKeyPairSender(
    gaslessTx, keyPairFromSecretKey
  );

  // 7. Wait until the node has processed the transaction and print the status
  const txInfo = await nodeClient.waitForTransaction({ 
    digest: txDigest,
    options: { showEffects: true }
  });

  // You can look up the digest in a Sui explorer - make sure to switch to Testnet
  console.log("\ntxDigest: ", txDigest);
  console.log("status:", txInfo.effects?.status.status);
}

//
// Builds a Move call for sponsorship in one step using our SDK helper function
//
async function clockMoveCallGaslessTransaction() : Promise<GaslessTransaction> {
  const gaslessTx = await buildGaslessTransaction(
    (txb) => {
      txb.moveCall({
        target: "0xfa0e78030bd16672174c2d6cc4cd5d1d1423d03c28a74909b2a148eda8bcca16::clock::access",
        arguments: [txb.object('0x6')],
      });
    },
    {
      sui: nodeClient
    }
  );
  console.log("\nbuildGaslessTransaction response (your GaslessTransaction for sponsorship):");
  console.log(gaslessTx);

  return gaslessTx
}

//
// Sponsors, signs, and executes a transaction for an Ed25519Keypair (sender) 
// Returns the transaction digest of the excuted transaction if successful.
//
async function sponsorAndExecuteTransactionForKeyPairSender(
  gaslessTx: GaslessTransaction, keypair: Ed25519Keypair) : Promise<string> {

  //  1. Send the GaslessTransaction to Shinami Gas Station for sponsorship.
  let sponsoredResponse = await gasStationClient.sponsorTransaction(
    gaslessTx // by not setting gaslessTx.gasBudget we take advantage of Shinami auto-budgeting
  );
  console.log("\nsponsorTransactionBlock response:");
  console.log(sponsoredResponse);

  // 2. Sign the full transaction payload with the sender's key.
  let senderSig = await Transaction.from(sponsoredResponse?.txBytes).sign(
    { signer: keypair }
  );

  // 3. Submit the full transaction payload, along with the gas owner 
  // and sender signatures, for execution on the Sui network
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
// -- Check a fund's balance and deposit more SUI in the fund if it's low -- //
//
async function checkFundBalanceAndDepositIfNeeded(suiCoinObjectIdToDeposit: string) : 
                                                   Promise<GaslessTransaction | undefined> {
  const MIN_FUND_BALANCE_MIST = 50_000_000_000; // 50 SUI
  const { balance, inFlight, depositAddress }  = await gasStationClient.getFund();

  // Deposit address can be null - see our FAQ for how to generate an address: 
  //   https://docs.shinami.com/docs/faq
  if (depositAddress && ((balance - inFlight) < MIN_FUND_BALANCE_MIST)) {
      // We're not actually checking it's a SUI coin we're transferring, which you should do.
      // We're also going to sponsor this with the gas fund we're depositing to, which only
      // works if there's a little SUI left.
      return await transferObjectToRecipientGaslessTransaction(
        suiCoinObjectIdToDeposit, 
        depositAddress
      );
  }

  return undefined;
}



//
//
// -- Other GaslessTransaction examples  -- //
//
//

//  Create two new small coins by taking MIST from a larger one.
async function splitCoinOwnedByGaslessTransaction(coinToSplitID: string, recipientAddress: string) : 
                                                                        Promise<GaslessTransaction> {
  return await buildGaslessTransaction(
    async (txb) => {
      const [coin1, coin2] = txb.splitCoins(txb.object(coinToSplitID), [
        txb.pure.u64(100),
        txb.pure.u64(100),
      ]);
      // each new object created in a transaction must be sent to an owner
      txb.transferObjects([coin1, coin2], txb.pure(bcs.Address.serialize(recipientAddress)));
    },
    {
      sui: nodeClient
    }
  );
}

//  Transfer one or more objects owned by the sender to the recipient.
//  An easy example is a small coin you created with the above transaction.
//  We also call this function inside the `checkFundBalanceAndDepositIfNeeded` function.
async function transferObjectToRecipientGaslessTransaction(objectID: string, recipientAddress: string) : 
                                                                            Promise<GaslessTransaction> {
  let gaslessTx = await buildGaslessTransaction(
    async (txb) => {
      txb.transferObjects(
        [txb.object(objectID)],
        txb.pure(bcs.Address.serialize(recipientAddress))
      );
    },
    {
      sui: nodeClient
    }
  );
  return gaslessTx;
}

//  Merge one coin (or more) into another, destroying the 
//   small coin(s) and increasing the value of the large one.
async function mergeCoinsGaslessTransaction(targetCoinID: string, coinToMergeID: string) : 
                                                              Promise<GaslessTransaction> {
  return await buildGaslessTransaction(
    async (txb) => {
      txb.mergeCoins(txb.object(targetCoinID), [txb.object(coinToMergeID)]);
    },
    {
      sui: nodeClient
    }
  );
}


//
// Another way to generate a GaslessTransaction.
//
async function clockMoveCallGaslessTransactionAlternateVersion() : Promise<GaslessTransaction> {
  let txb = new Transaction();
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
  console.log("\nTransactionKind base64 string for sponsorship:");
  console.log(gaslessPayloadBase64);

  return {
    txKind: gaslessPayloadBase64,
    sender: SENDER_ADDRESS,
    gasBudget: undefined,
    gasPrice: undefined
  };
}


//
// Check the status of a sponsorship. Generally not needed since you
// execute transactions quickly after sponsoring and you can always
// just re-sponsor for the rare sponsorship that expires.
//
async function checkSponsorshipStatusExample() : Promise<void> {

  const gaslessTx = await clockMoveCallGaslessTransaction();

  gaslessTx.sender = SENDER_ADDRESS;
  const sponsorship = await gasStationClient.sponsorTransaction(gaslessTx);

  const sponsorshipStatus = await gasStationClient.getSponsoredTransactionStatus(
    sponsorship.txDigest
  );
  console.log("sponsored txDigest:", sponsorship.txDigest);
  console.log("Sponsorship Status:", sponsorshipStatus);
}
// await checkSponsorshipStatusExample();