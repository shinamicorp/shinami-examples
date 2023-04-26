"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sui_js_1 = require("@mysten/sui.js");
const typed_rpc_1 = require("typed-rpc");
// The Key Service is Shinami's secure and stateless way to get access to the In-App Wallet
//const KEY_SERVICE_RPC_URL = "https://api.shinami.com/key/v1/<API_ACCESS_KEY>";
const KEY_SERVICE_RPC_URL = "https://api.shinami.com/key/v1/sui_testnet_8a6413ed2278fbbacae9042ccd6e0bf4";
// The Wallet Service is the endpoint to issue calls on behalf of the wallet.
//const WALLET_SERVICE_RPC_URL = "https://api.shinami.com/wallet/v1/<API_ACCESS_KEY>";
const WALLET_SERVICE_RPC_URL = "https://api.shinami.com/wallet/v1/sui_testnet_8a6413ed2278fbbacae9042ccd6e0bf4";
// Shinami Sui Node endpoint + Mysten provided faucet endpoint:
const connection = new sui_js_1.Connection({
    //fullnode: 'https://node.shinami.com/api/v1/<API_ACCESS_KEY>',
    fullnode: 'https://node.shinami.com/api/v1/sui_testnet_8a6413ed2278fbbacae9042ccd6e0bf4',
    faucet: 'https://faucet.testnet.sui.io/gas'
});
const suiProvider = new sui_js_1.JsonRpcProvider(connection);
//const walletId = "<WALLET_ID>";
const walletId = "walletId";
//const secret = "<SECRET>";
const secret = "my_secret";
const GAS_BUDGET = 5000000;
const keyService = (0, typed_rpc_1.rpcClient)(KEY_SERVICE_RPC_URL);
const walletService = (0, typed_rpc_1.rpcClient)(WALLET_SERVICE_RPC_URL);
// Create a programmable transaction block to split off two new coins of value 10,000 and 20,000 MIST.
// The transaction block without gas context
const progTxnSplitGasless = (sender, sourceCoinId) => {
    const txb = new sui_js_1.TransactionBlock();
    // Split two new coins out of sourceCoinId, one with 10000 balance, and the other with 20000
    const [coin1, coin2] = txb.splitCoins(txb.object(sourceCoinId), [txb.pure(10000), txb.pure(20000)]);
    // Each new object created in a transaction must have an owner
    txb.transferObjects([coin1, coin2], txb.pure(sender));
    return txb;
};
// The transaction block with gas context 
const progTxnSplit = (sender, sourceCoinId) => {
    const txb = new sui_js_1.TransactionBlock();
    // Split two new coins out of sourceCoinId, one with 10000 balance, and the other with 20000
    const [coin1, coin2] = txb.splitCoins(txb.object(sourceCoinId), [txb.pure(10000), txb.pure(20000)]);
    // Each new object created in a transaction must have an owner
    txb.transferObjects([coin1, coin2], txb.pure(sender));
    txb.setSender(sender);
    txb.setGasBudget(GAS_BUDGET);
    txb.setGasOwner(sender);
    return txb;
};
const inAppWalletE2E = async () => {
    // Create an ephemeral session token to access In-App Wallet functionality
    const sessionToken = await keyService.shinami_key_createSession(secret);
    // Create a new wallet (can only be done once with the same walletId)
    //const createdWalletAddress = await walletService.shinami_wal_createWallet(walletId, sessionToken);
    // Retrieve the wallet address via the walletId. Should be the same as createdWalletAddress
    const walletAddress = await walletService.shinami_wal_getWallet(walletId);
    console.log("WAL ADDR:", walletAddress);
    // Deposit some SUI to the wallet via the faucet
    //const faucetResponse = await suiProvider.requestSuiFromFaucet(walletAddress);
    //const sourceCoinId = faucetResponse.transferredGasObjects[0].id;
    const sourceCoinId = "0x8388d2d326495c3da164804612d28c58754fa684164d259794cff70cc09ea815";
    console.log("SOURCE COIN:", sourceCoinId);
    // // Get the transaction block of the full transaction.
    // const txbFull = progTxnSplit(walletAddress, sourceCoinId);
    // // Generate the bcs serialized transaction payload
    // const payloadBytesFull = await txbFull.build({ provider: suiProvider });
    // // Convert the payload byte array to a base64 encoded string
    // const payloadBytesFullBase64 = btoa(
    //     payloadBytesFull.reduce((data, byte) => data + String.fromCharCode(byte), '')
    // );
    // // Sign the payload via the Shinami Wallet Service.
    // const sig = await walletService.shinami_wal_signTransactionBlock(walletId, sessionToken, payloadBytesFullBase64);
    // // Execute the signed transaction on the Sui blockchain
    // const executeResponseFull = await suiProvider.executeTransactionBlock(
    //     {
    //         transactionBlock: payloadBytesFullBase64,
    //         signature: sig,
    //         options: {showEffects: true},
    //         requestType: "WaitForLocalExecution"
    //     }
    // );
    // console.log("Execution Status:", executeResponseFull.effects?.status.status);
    // Get the transaction block of the gasless transaction
    const txbGasless = progTxnSplitGasless(walletAddress, sourceCoinId);
    // Generate the bcs serialized transaction payload
    const payloadBytesGasless = await txbGasless.build({ provider: suiProvider, onlyTransactionKind: true });
    // Convert the payload byte array to a base64 encoded string
    const payloadBytesGaslessBase64 = btoa(payloadBytesGasless.reduce((data, byte) => data + String.fromCharCode(byte), ''));
    // Sponsor and execute the transaction with one call
    const executeResponse = await walletService.shinami_wal_executeGaslessTransactionBlock(walletId, sessionToken, payloadBytesGaslessBase64, GAS_BUDGET, {
        showInput: false,
        showRawInput: false,
        showEffects: true,
        showEvents: false,
        showObjectChanges: false,
        showBalanceChanges: false
    }, "WaitForLocalExecution");
    console.log("Execution Status:", executeResponse.effects?.status.status);
};
inAppWalletE2E();
