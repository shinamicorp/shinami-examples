// 1. Import everything we'll need for the rest of the tutorial
import { 
    WalletClient, 
    KeyClient, 
    createSuiClient, 
    GasStationClient,
    buildGaslessTransactionBytes, 
} from "@shinami/clients";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { verifyPersonalMessage } from '@mysten/sui.js/verify';

// 2. Copy your access key value
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}";

// // 3. Set up two wallet ids and a sercret for each
const WALLET_ONE_ID = "{{walletOneId}}";
const WALLET_ONE_SECRET = "{{walletOneSecret}}";
const WALLET_TWO_ID = "{{walletTwoId}}";
const WALLET_TWO_SECRET = "{{walletTwoSecret}}";

// 4. Instantiate your Shinami clients
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const nodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// 5. Set up some variables we'll use in the examples below
let sessionToken = "";
let senderAddress = "";
let senderSignature = null;

// 6. Create the first wallet by generating a session token using its assocated secret
sessionToken = await keyClient.createSession(WALLET_ONE_SECRET);
const WALLET_ONE_SUI_ADDRESS = await walletClient.createWallet(WALLET_ONE_ID, sessionToken);
console.log(WALLET_ONE_SUI_ADDRESS);

// 7. Create the second wallet by  generating a session token using its assocated secret
sessionToken = await keyClient.createSession(WALLET_TWO_SECRET);
const WALLET_TWO_SUI_ADDRESS = await walletClient.createWallet(WALLET_TWO_ID, sessionToken)
console.log(WALLET_TWO_SUI_ADDRESS);


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

// 9. Set your gas budget for sponsorship
const GAS_BUDGET = 5_000_000;

// 10. We need to generate a new session token since the
//     previous value was associated with wallet two.
sessionToken = await keyClient.createSession(WALLET_ONE_SECRET);

// 11. Sponsor, sign, and execute in one call!
const sponsorSignAndExecuteResponse = await walletClient.executeGaslessTransactionBlock(
  WALLET_ONE_ID,
  sessionToken,
  gaslessPayloadBase64,
  GAS_BUDGET,
  { showEffects: true },
  "WaitForLocalExecution"
);

// You can look up the digest in Sui Explorer - make sure to switch to Testnet
console.log(sponsorSignAndExecuteResponse.digest);

// If you forget a wallet address, you can look it up with wallet service:
senderAddress = await walletClient.getWallet(WALLET_ONE_ID);
console.log(senderAddress);



// -- Sponsor, sign, and execute a transaction in three calls -- //

const gasStationClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY); 

// Use getWallet to get the Sui address of a previously-created invisible wallet
senderAddress = await walletClient.getWallet(WALLET_TWO_ID);

// Sponsor the transaction with a call to Gas Station
const sponsoredResponse = await gasStationClient.sponsorTransactionBlock(
    gaslessPayloadBase64,
    senderAddress,
    GAS_BUDGET
  );

// Generate a new session token with wallet 2's secret
sessionToken = await keyClient.createSession(WALLET_TWO_SECRET);

// Sign the transaction with wallet 2 as the sender
senderSignature = await walletClient.signTransactionBlock(
    WALLET_TWO_ID,
    sessionToken,
    sponsoredResponse.txBytes
);

// Use the TransactionBlock and sponsor signature produced by 
//  `sponsorTransactionBlock` along with the sender's signature we 
//  just obtained to execute the transaction.
let executeSponsoredTxResponse = await nodeClient.executeTransactionBlock({
    transactionBlock: sponsoredResponse.txBytes,
    signature: [senderSignature.signature, sponsoredResponse.signature],
    options: { showEffects: true },
    requestType: "WaitForLocalExecution",
  });

console.log(executeSponsoredTxResponse);


// -- Sign and execute a non-sponsored transaction -- //

// You can send Testnet Sui to your wallet address 
//  via the Sui Discord Testnet faucet

sessionToken = await keyClient.createSession(WALLET_ONE_SECRET);
senderAddress = await walletClient.getWallet(WALLET_ONE_ID);

// Set this to the id of a Sui coin owned by the sender address
const COIN_TO_SPLIT = "{{coinToSplitObjectId}}";

// Create  new TransactionBlock and add the operations to create
//  two new coins from MIST contained by the COIN_TO_SPLIT
const txb = new TransactionBlock();
const [coin1, coin2] = txb.splitCoins(txb.object(COIN_TO_SPLIT), [
    txb.pure(10000),
    txb.pure(20000),
]);
    // Each new object created in a transaction must be sent to an owner
txb.transferObjects([coin1, coin2], txb.pure(senderAddress));
    // Set gas context and sender
txb.setSender(senderAddress);
txb.setGasBudget(GAS_BUDGET);
txb.setGasOwner(senderAddress);


// Generate the bcs serialized transaction data without any gas object data
const txBytes = await txb.build({ client: nodeClient, onlyTransactionKind: false});

// Convert the byte array to a base64 encoded string
const txBytesBase64 = btoa(
    txBytes
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
);

// Obtain the sender's signature
senderSignature = await walletClient.signTransactionBlock(
    WALLET_ONE_ID,
    sessionToken,
    txBytesBase64
);
// Execute the transaction 
const executeNonSponsoredTxResponse = await nodeClient.executeTransactionBlock({
    transactionBlock: txBytesBase64,
    signature: [senderSignature.signature],
    options: { showEffects: true },
    requestType: "WaitForLocalExecution",
  });

console.log(executeNonSponsoredTxResponse);



//  -- Sign a personal message from an invisible wallet and then verify the signer -- //

sessionToken = await keyClient.createSession(WALLET_ONE_SECRET);

// Encode the as a base64 string
let message = "I have the private keys."; 
let messageAsBase64String = btoa(message);

// Use Shinami Wallet Service to sign the message
let signature = await walletClient.signPersonalMessage(
  WALLET_ONE_ID,
  sessionToken,
  messageAsBase64String,
  true // Defaults to true when using our SDK if not provided. Needs to 
       // be true to work with the verifyPersonalMessage method below
);

// When we check the signature, we encode the message as a byte array
// and not a base64 string like when we signed it
let messageBytes = new TextEncoder().encode(message); 

// Failure throws a `Signature is not valid for the provided message` Error
let publicKey = await verifyPersonalMessage(messageBytes, signature);

// Get the wallet address we signed with so we can check against it
let walletAddress = await walletClient.getWallet(WALLET_ONE_ID);

console.log(walletAddress == publicKey.toSuiAddress());
// true
