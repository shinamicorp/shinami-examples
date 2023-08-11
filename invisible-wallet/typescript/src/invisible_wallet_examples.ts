import { 
    Connection, 
    JsonRpcProvider, 
    TransactionBlock,
    SuiTransactionBlockResponse,
    ExecuteTransactionRequestType,
} from "@mysten/sui.js";
import { rpcClient } from "typed-rpc";

// The Key Service is Shinami's secure and stateless way to get access to the Invisible Wallet
const KEY_SERVICE_RPC_URL = "https://api.shinami.com/key/v1/";

// The Wallet Service is the endpoint to issue calls on behalf of the wallet.
const WALLET_SERVICE_RPC_URL = "https://api.shinami.com/wallet/v1/";

// Shinami Sui Node endpoint + Mysten provided faucet endpoint:
const connection = new Connection({
    fullnode: 'https://api.shinami.com/node/v1/<API_ACCESS_KEY>',
});

const suiProvider = new JsonRpcProvider(connection);
const walletId = "<WALLET_ID>";
const secret = "<SECRET>";
const GAS_BUDGET = 5000000;

// You can send testnet Sui to your wallet address via the Sui Discord testnet faucet
const sourceCoinId = "<COIN_ID>";

// Key Service interaction setup
interface KeyServiceRpc {
    shinami_key_createSession(secret: string): string;
}
const keyService = rpcClient<KeyServiceRpc>(KEY_SERVICE_RPC_URL, {
    getHeaders() {
        return {
            "X-API-Key": "<API_ACCESS_KEY>"
        };
    },
});

// Wallet Service interaction setup
interface WalletServiceRpc {
    shinami_wal_createWallet(walletId: string, sessionToken: string): string;
    shinami_wal_getWallet(walletId: string): string;
    shinami_wal_signTransactionBlock(walletId: string, sessionToken: string, txBytes: string):
        SignTransactionResult;
    shinami_wal_executeGaslessTransactionBlock(
        walletId: string, 
        sessionToken: string, 
        txBytes: string, 
        gasBudget: number, 
        options?: {}, 
        requestType?: ExecuteTransactionRequestType
    ): SuiTransactionBlockResponse;
}

interface SignTransactionResult {
    signature: string;
    txDigest: string;
}

const walletService = rpcClient<WalletServiceRpc>(WALLET_SERVICE_RPC_URL, {
    getHeaders() {
        return {
            "X-API-Key": "<API_ACCESS_KEY>"
        };
    },
});

// Create a programmable transaction block to split off two new coins of value 10,000 and 20,000 MIST.

// The transaction block without gas context
const progTxnSplitGasless = (sender:string, sourceCoinId:string) => {
    const txb = new TransactionBlock();

    // Split two new coins out of sourceCoinId, one with 10000 balance, and the other with 20000
    const [coin1, coin2] = txb.splitCoins(
        txb.object(sourceCoinId),
        [txb.pure(10000), txb.pure(20000)]
    );
    // Each new object created in a transaction must have an owner
    txb.transferObjects(
        [coin1, coin2],
        txb.pure(sender)
    );
    return txb;
}

// The transaction block with gas context 
const progTxnSplit = (sender:string, sourceCoinId:string) => {
    const txb = new TransactionBlock();

    // Split two new coins out of sourceCoinId, one with 10000 balance, and the other with 20000
    const [coin1, coin2] = txb.splitCoins(
        txb.object(sourceCoinId),
        [txb.pure(10000), txb.pure(20000)]
    );
    // Each new object created in a transaction must have an owner
    txb.transferObjects(
        [coin1, coin2],
        txb.pure(sender)
    );
    txb.setSender(sender);
    txb.setGasBudget(GAS_BUDGET);
    txb.setGasOwner(sender);
    return txb;
}

const invisibleWalletE2E = async() => {
    // Create an ephemeral session token to access Invisible Wallet functionality
    const sessionToken = await keyService.shinami_key_createSession(secret);

    // Create a new wallet (can only be done once with the same walletId). Make
    // sure to transfer Sui coins to your wallet before trying to run the
    // following transactions
    const createdWalletAddress = await walletService.shinami_wal_createWallet(walletId, sessionToken);

    // Retrieve the wallet address via the walletId. Should be the same as createdWalletAddress
    const walletAddress = await walletService.shinami_wal_getWallet(walletId);

    // Get the transaction block of the full transaction.
    const txbFull = progTxnSplit(walletAddress, sourceCoinId);

    // Generate the bcs serialized transaction payload
    const payloadBytesFull = await txbFull.build({ provider: suiProvider });

    // Convert the payload byte array to a base64 encoded string
    const payloadBytesFullBase64 = btoa(
        payloadBytesFull.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Sign the payload via the Shinami Wallet Service.
    const sig = await walletService.shinami_wal_signTransactionBlock(walletId, sessionToken, payloadBytesFullBase64);

    // Execute the signed transaction on the Sui blockchain
    const executeResponseFull = await suiProvider.executeTransactionBlock(
        {
            transactionBlock: payloadBytesFullBase64,
            signature: sig.signature,
            options: {showEffects: true},
            requestType: "WaitForLocalExecution"
        }
    );
    console.log("Execution Status:", executeResponseFull.effects?.status.status);

    // Get the transaction block of the gasless transaction
    const txbGasless = progTxnSplitGasless(walletAddress, sourceCoinId);

    // Generate the bcs serialized transaction payload
    const payloadBytesGasless = await txbGasless.build({ provider: suiProvider, onlyTransactionKind: true });

    // Convert the payload byte array to a base64 encoded string
    const payloadBytesGaslessBase64 = btoa(
        payloadBytesGasless.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Sponsor and execute the transaction with one call
    const executeResponseGasless = await walletService.shinami_wal_executeGaslessTransactionBlock(
        walletId,
        sessionToken,
        payloadBytesGaslessBase64,
        GAS_BUDGET,
        {
            showInput: false,
            showRawInput: false,
            showEffects: true,
            showEvents: false,
            showObjectChanges: false,
            showBalanceChanges: false
        },
        "WaitForLocalExecution"
    );
    console.log("Execution Status:", executeResponseGasless.effects?.status.status);
}

invisibleWalletE2E();
