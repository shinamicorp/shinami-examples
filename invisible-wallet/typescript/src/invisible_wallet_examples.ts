// import everything we'll need for the rest of the tutorial
import { 
    WalletClient, 
    KeyClient, 
    createSuiClient, 
    GasStationClient,
    buildGaslessTransactionBytes, 
} from "@shinami/clients";
import { TransactionBlock } from "@mysten/sui.js/transactions";


const ALL_SERVICES_TESTNET_ACCESS_KEY = "sui_testnet_8c897855d70efd2f361ad89cbba8cb53";

const WALLET_ONE_ID = "12345";
const WALLET_ONE_SECRET = "12345";

const WALLET_TWO_ID = "67890";
const WALLET_TWO_SECRET = "67890";


const keyclient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);


// Create the first wallet by generating a session token using its assocated secret
var sessionToken = await keyclient.createSession(WALLET_ONE_SECRET);
// const WALLET_ONE_SUI_ADDRESS = await walletClient.createWallet(WALLET_ONE_ID, sessionToken);
const WALLET_ONE_SUI_ADDRESS = await walletClient.getWallet(WALLET_ONE_ID);
console.log(WALLET_ONE_SUI_ADDRESS);

// Create the second wallet by  generating a session token using its assocated secret
// sessionToken = await keyclient.createSession(WALLET_TWO_SECRET);
// const WALLET_TWO_SUI_ADDRESS = await walletClient.createWallet(WALLET_TWO_ID, sessionToken)
// console.log(WALLET_TWO_SUI_ADDRESS);

// 2. Set up your Node client to encode the transaction to sponsor in a BCS serialized, base64 string
const nodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// 3. Generate the TransactionKind for sponsorship as a Base64 encoded string
// const gaslessPayloadBase64 = await buildGaslessTransactionBytes({
//   sui: nodeClient,
//   build: async (txb) => {
//     txb.moveCall({
//       target: "0xfa0e78030bd16672174c2d6cc4cd5d1d1423d03c28a74909b2a148eda8bcca16::clock::access",
//       arguments: [txb.object('0x6')]
//     });
//   }
// });

const GAS_BUDGET = 5_000_000;

// We need to generate a new session token since the previous value
//  was associated with wallet two
var sessionToken = await keyclient.createSession(WALLET_ONE_SECRET);

// 8. sponsor, sign, and execute in one call!
// const sponsorSignAndExecuteResponse = await walletClient.executeGaslessTransactionBlock(
//   WALLET_ONE_ID,
//   sessionToken,
//   gaslessPayloadBase64,
//   GAS_BUDGET,
//   { showEffects: true },
//   "WaitForLocalExecution"
// );

// You can look up the digest in Sui Explorer - make sure to switch to Testnet
// console.log(sponsorSignAndExecuteResponse.digest);

// If you forget a wallet address, you can look it up with wallet service:
var senderAddress = await walletClient.getWallet(WALLET_ONE_ID);

// console.log(senderAddress);
// Example: 0x7f32326c79c5acd20ec0ab090ef1f751231c243152ed6449ea0554db99f28a1b
// As expected, this is the sender of the above transaction digest when 
//  I search in the Sui Explorer



// // You can send testnet Sui to your wallet address via the Sui Discord testnet faucet
// const sourceCoinId = "<COIN_ID>";


// const gasStationClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY); 

// senderAddress = await walletClient.getWallet(WALLET_TWO_ID);
// const sponsoredResponse = await gasStationClient.sponsorTransactionBlock(
//     gaslessPayloadBase64,
//     senderAddress,
//     GAS_BUDGET
//   );

// sessionToken = await keyclient.createSession(WALLET_TWO_SECRET);


// const senderSig = await walletClient.signTransactionBlock(
//     WALLET_TWO_ID,
//     sessionToken,
//     sponsoredResponse.txBytes
// );


// const executeResponse = await nodeClient.executeTransactionBlock({
//     transactionBlock: sponsoredResponse.txBytes,
//     signature: [senderSig.signature, sponsoredResponse.signature],
//     options: { showEffects: true },
//     requestType: "WaitForLocalExecution",
//   });

// console.log(executeResponse);

sessionToken = await keyclient.createSession(WALLET_ONE_SECRET);
senderAddress = await walletClient.getWallet(WALLET_ONE_ID);

const COIN_TO_SPLIT = "0xd290a6cb617f38fd46758cec73e3a51c8452969074caea89624989c3de95c34e";

const txb = new TransactionBlock();
const [coin1, coin2] = txb.splitCoins(txb.object(COIN_TO_SPLIT), [
    txb.pure(10000),
    txb.pure(20000),
]);
// each new object created in a transaction must be sent to an owner
txb.transferObjects([coin1, coin2], txb.pure(senderAddress));
    // Set gas context and sender
txb.setSender(senderAddress);
txb.setGasBudget(GAS_BUDGET);
txb.setGasOwner(senderAddress);


// generate the bcs serialized transaction data without any gas object data
const txBytes = await txb.build({ client: nodeClient, onlyTransactionKind: false});

// convert the byte array to a base64 encoded string
const txBytesBase64 = btoa(
    txBytes
        .reduce((data, byte) => data + String.fromCharCode(byte), '')
);

const senderSig = await walletClient.signTransactionBlock(
    WALLET_ONE_ID,
    sessionToken,
    txBytesBase64
);


const executeResponse = await nodeClient.executeTransactionBlock({
    transactionBlock: txBytesBase64,
    signature: [senderSig.signature],
    options: { showEffects: true },
    requestType: "WaitForLocalExecution",
  });

console.log(executeResponse);



// });

// // Create a programmable transaction block to split off two new coins of value 10,000 and 20,000 MIST.

// // The transaction block without gas context
// const progTxnSplitGasless = (sender:string, sourceCoinId:string) => {
//     const txb = new TransactionBlock();

//     // Split two new coins out of sourceCoinId, one with 10000 balance, and the other with 20000
//     const [coin1, coin2] = txb.splitCoins(
//         txb.object(sourceCoinId),
//         [txb.pure(10000), txb.pure(20000)]
//     );
//     // Each new object created in a transaction must have an owner
//     txb.transferObjects(
//         [coin1, coin2],
//         txb.pure(sender)
//     );
//     return txb;
// }

// // The transaction block with gas context
// const progTxnSplit = (sender:string, sourceCoinId:string) => {
//     const txb = new TransactionBlock();

//     // Split two new coins out of sourceCoinId, one with 10000 balance, and the other with 20000
//     const [coin1, coin2] = txb.splitCoins(
//         txb.object(sourceCoinId),
//         [txb.pure(10000), txb.pure(20000)]
//     );
//     // Each new object created in a transaction must have an owner
//     txb.transferObjects(
//         [coin1, coin2],
//         txb.pure(sender)
//     );
//     txb.setSender(sender);
//     txb.setGasBudget(GAS_BUDGET);
//     txb.setGasOwner(sender);
//     return txb;
// }

// const invisibleWalletE2E = async() => {
//     // Create an ephemeral session token to access Invisible Wallet functionality
//     const sessionToken = await keyService.shinami_key_createSession(secret);

//     // Create a new wallet (can only be done once with the same walletId). Make
//     // sure to transfer Sui coins to your wallet before trying to run the
//     // following transactions
//     const createdWalletAddress = await walletService.shinami_wal_createWallet(walletId, sessionToken);

//     // Retrieve the wallet address via the walletId. Should be the same as createdWalletAddress
//     const walletAddress = await walletService.shinami_wal_getWallet(walletId);

//     // Get the transaction block of the full transaction.
//     const txbFull = progTxnSplit(walletAddress, sourceCoinId);

//     // Generate the bcs serialized transaction payload
//     const payloadBytesFull = await txbFull.build({ client: suiClient });

//     // Convert the payload byte array to a base64 encoded string
//     const payloadBytesFullBase64 = btoa(
//         payloadBytesFull.reduce((data, byte) => data + String.fromCharCode(byte), '')
//     );

//     // Sign the payload via the Shinami Wallet Service.
//     const sig = await walletService.shinami_wal_signTransactionBlock(walletId, sessionToken, payloadBytesFullBase64);

//     // Execute the signed transaction on the Sui blockchain
//     const executeResponseFull = await suiClient.executeTransactionBlock(
//         {
//             transactionBlock: payloadBytesFullBase64,
//             signature: sig.signature,
//             options: {showEffects: true},
//             requestType: "WaitForLocalExecution"
//         }
//     );
//     console.log("Execution Status:", executeResponseFull.effects?.status.status);

//     // Get the transaction block of the gasless transaction
//     const txbGasless = progTxnSplitGasless(walletAddress, sourceCoinId);

//     // Generate the bcs serialized transaction payload
//     const payloadBytesGasless = await txbGasless.build({ client: suiClient, onlyTransactionKind: true });

//     // Convert the payload byte array to a base64 encoded string
//     const payloadBytesGaslessBase64 = btoa(
//         payloadBytesGasless.reduce((data, byte) => data + String.fromCharCode(byte), '')
//     );

//     // Sponsor and execute the transaction with one call
//     const executeResponseGasless = await walletService.shinami_wal_executeGaslessTransactionBlock(
//         walletId,
//         sessionToken,
//         payloadBytesGaslessBase64,
//         GAS_BUDGET,
//         {
//             showInput: false,
//             showRawInput: false,
//             showEffects: true,
//             showEvents: false,
//             showObjectChanges: false,
//             showBalanceChanges: false
//         },
//         "WaitForLocalExecution"
//     );
//     console.log("Execution Status:", executeResponseGasless.effects?.status.status);
// }

// invisibleWalletE2E();
