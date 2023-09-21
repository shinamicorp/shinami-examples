import { SuiClient } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { rpcClient } from "typed-rpc";

// The initiator of the transaction
const SENDER_ADDRESS = "<SUI_ADDRESS>";
const SENDER_PRIVATE_KEY = "<PRIVATE_KEY>";
const SENDER_RECOVERY_PHRASE = "<RECOVERY_PHRASE>";

// gas budget, in MIST
const GAS_BUDGET = 5000000;

// Gas Station endpoint:
const SPONSOR_RPC_URL = "https://api.shinami.com/gas/v1/<GAS_ACCESS_KEY>";

// Sui Node endpoint:
const suiClient = new SuiClient({
  // Sui Node endpoint:
  url: "https://api.shinami.com/node/v1/<NODE_ACCESS_KEY>",
});

// Create the sender's address key pair from the recovery phrase
// const keyPair = Ed25519Keypair.deriveKeypair(SENDER_RECOVERY_PHRASE);

// Create the sender's address key pair from the sender's private key
const buf = Buffer.from(SENDER_PRIVATE_KEY, "base64");
const keyPair = Ed25519Keypair.fromSecretKey(buf.slice(1));

// Setup for issuing json rpc calls to the gas station for sponsorship. We use typed-rpc typescript lib here.
interface SponsoredTransaction {
  txBytes: string;
  txDigest: string;
  signature: string;
  expireAtTime: number;
  expireAfterEpoch: number;
}
type SponsoredTransactionStatus = "IN_FLIGHT" | "COMPLETE" | "INVALID";

interface SponsorRpc {
  gas_sponsorTransactionBlock(
    txBytes: string,
    sender: string,
    gasBudget: number
  ): SponsoredTransaction;
  gas_getSponsoredTransactionBlockStatus(
    txDigest: string
  ): SponsoredTransactionStatus;
}
const sponsor = rpcClient<SponsorRpc>(SPONSOR_RPC_URL);

// Different examples of programmable transaction blocks that can be crafted.
const progTxnTransfer = () => {
  // The receiver of a transaction
  const RECIPIENT_ADDRESS = "<SUI_ADDRESS>";

  // For transferring objects transaction
  const OBJECT_TO_SEND = "<OBJECT_ID>";

  const txb = new TransactionBlock();
  // create a programmable transaction to send an object from the sender to the recipient
  txb.transferObjects(
    [txb.object(OBJECT_TO_SEND)],
    txb.pure(RECIPIENT_ADDRESS)
  );
  return txb;
};

const progTxnSplit = () => {
  const COIN_TO_SPLIT = "<COIN_OBJECT_ID>";

  const txb = new TransactionBlock();
  const [coin1, coin2] = txb.splitCoins(txb.object(COIN_TO_SPLIT), [
    txb.pure(10000),
    txb.pure(20000),
  ]);
  // each new object created in a transaction must be sent to an owner
  txb.transferObjects([coin1, coin2], txb.pure(SENDER_ADDRESS));
  return txb;
};

const progTxnMerge = () => {
  const COIN_TARGET = "<COIN_OBJECT_ID>";
  const COIN_SOURCE1 = "<COIN_OBJECT_ID>";
  const COIN_SOURCE2 = "<COIN_OBJECT_ID>";
  const txb = new TransactionBlock();
  txb.mergeCoins(txb.object(COIN_TARGET), [
    txb.object(COIN_SOURCE1),
    txb.object(COIN_SOURCE2),
  ]);
  return txb;
};

const progTxnMoveCall = () => {
  const txb = new TransactionBlock();
  txb.moveCall({
    target: "<PACKAGE_ADDRESS>::<MODULE_NAME>::<METHOD_NAME>",
    arguments: [
      // the custom args to this move call
      //txb.pure(<PURE_VALUE>),
      //txb.pure(<PURE_VALUE>),
      //txb.object("<OBJECT_ID>")
      //...
    ],
  });
  return txb;
};

const sponsorTransactionE2E = async () => {
  // get the gasless TransactionBlock for the desired programmable transaction
  const gaslessTxb = progTxnTransfer();
  //const gaslessTxb = progTxnSplit();
  //const gaslessTxb = progTxnMerge();
  //const gaslessTxb = progTxnMoveCall();

  // generate the bcs serialized transaction data without any gas object data
  const gaslessPayloadBytes = await gaslessTxb.build({
    client: suiClient,
    onlyTransactionKind: true,
  });

  // convert the byte array to a base64 encoded string to return
  const gaslessPayloadBase64 = btoa(
    gaslessPayloadBytes.reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );

  // Send the gasless programmable payload to Shinami Gas Station for sponsorship
  const sponsoredResponse = await sponsor.gas_sponsorTransactionBlock(
    gaslessPayloadBase64,
    SENDER_ADDRESS,
    GAS_BUDGET
  );

  // The transaction should be sponsored now, so its status will be "IN_FLIGHT"
  const sponsoredStatus = await sponsor.gas_getSponsoredTransactionBlockStatus(
    sponsoredResponse.txDigest
  );
  console.log("Sponsorship Status:", sponsoredStatus);

  // The sponsoredReponse will contain the full transaction payload and the signature of the gas object owner. To send it off for execution,
  // the full transaction payload still needs to be signed by the sender of the transaction.

  // Sign the full transaction payload with the sender's key.
  const senderSig = await TransactionBlock.from(sponsoredResponse.txBytes).sign(
    {
      signer: keyPair,
    }
  );

  // Send the full transaction payload, along with the gas owner and sender's signatures for execution on the sui network
  const executeResponse = await suiClient.executeTransactionBlock({
    transactionBlock: sponsoredResponse.txBytes,
    signature: [senderSig.signature, sponsoredResponse.signature],
    options: { showEffects: true },
    requestType: "WaitForLocalExecution",
  });
  console.log("Execution Status:", executeResponse.effects?.status.status);
};

sponsorTransactionE2E();
