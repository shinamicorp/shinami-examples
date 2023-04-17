import { 
    Connection, 
    JsonRpcProvider,  
    TransactionBlock
} from "@mysten/sui.js";
import { rpcClient } from "typed-rpc";

// gas budget, in MIST
const GAS_BUDGET = 5000000;    

// Gas Station endpoint:
const SPONSOR_RPC_URL = "https://api.shinami.com/gas/v1/<GAS_ACCESS_KEY>";

// Sui Node endpoint:
const connection = new Connection({
    fullnode: 'https://node.shinami.com/api/v1/<NODE_ACCESS_KEY>'
});
const suiProvider = new JsonRpcProvider(connection);

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
    gas_sponsorTransactionBlock(txBytes: string, sender: string, gasBudget: number): SponsoredTransaction;
    gas_getSponsoredTransactionBlockStatus(txDigest: string): SponsoredTransactionStatus;
}
const sponsor = rpcClient<SponsorRpc>(SPONSOR_RPC_URL);

// Define the interfaces for the Shinami RPC methods
interface ShinamiKeyRPC {
  shinami_key_createSession(secret: string): string;
}

interface ShinamiWalletRPC {
  shinami_wal_createWallet(walletId: string, sessionToken: string): string;
  shinami_wal_signTransactionBlock(walletId: string, sessionToken: string, txBytes: string): string;
}

// Set up the walletapi RPC client configuration
const shinamiKeyRpcClient = rpcClient<ShinamiKeyRPC>('https://api.shinami.com/key/v1', {
  getHeaders() {
    return {
      'X-API-Key': '<WALLET_ACCESS_KEY>',
      'Content-Type': 'application/json',
    };
  },
});

const shinamiWalletRpcClient = rpcClient<ShinamiWalletRPC>('https://api.shinami.com/wallet/v1', {
  getHeaders() {
    return {
      'X-API-Key': '<WALLET_ACCESS_KEY>',
      'Content-Type': 'application/json',
    };
  },
});

// Function to create a session
async function createShinamiSession(secret: string): Promise<string> {
  try {
    const result = await shinamiKeyRpcClient.shinami_key_createSession(secret);
    console.log('Session created:', result);
    return result;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

// Function to create a wallet
async function createShinamiWallet(walletId: string, sessionToken: string): Promise<string> {
  try {
    const result = await shinamiWalletRpcClient.shinami_wal_createWallet(walletId, sessionToken);
    console.log('Wallet created:', result);
    return result;
  } catch (error) {
    console.error('Error creating wallet:', error);
    throw error;
  }
}

// Function to sign a transaction block
async function signTransactionBlock(walletId: string, sessionToken: string, txBytes: string): Promise<string> {
  try {
    const result = await shinamiWalletRpcClient.shinami_wal_signTransactionBlock(walletId, sessionToken, txBytes);
    console.log('Transaction block signed:', result);
    return result;
  } catch (error) {
    console.error('Error signing transaction block:', error);
    throw error;
  }
}


// Txn move call sample, using Sui counter sample
const progTxnMoveCall = () => {
    const txb = new TransactionBlock();
    txb.moveCall({
        target: "0xe8df4d7da4bcac2024204ff1e3f92c13cc57156b0e28982d8bfd53182b007c63::counter::increment",
        arguments: [
            // the custom args to this move call
            txb.pure("0xaa4f15f139f00c11aac0a87907a9c27f5c4590755fd11867c6410562fd0b1683"),
            //txb.pure(<PURE_VALUE>),
            //txb.object("<OBJECT_ID>")
            //...
        ]
    });
    return txb;
}

const sponsorTransactionE2E = async() => {
    // get the gasless TransactionBlock for the desired programmable transaction
    const gaslessTxb = progTxnMoveCall();

    // generate the bcs serialized transaction data without any gas object data
    const gaslessPayloadBytes = await gaslessTxb.build({ provider: suiProvider, onlyTransactionKind: true});

    // convert the byte array to a base64 encoded string to return
    const gaslessPayloadBase64 = btoa(
        gaslessPayloadBytes
            .reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // create a session token and in-app wallet
    const sessionToken = await createShinamiSession("<SECRET>");
    const walletAddress = await createShinamiWallet("<SENDER_WALLET_ID>", sessionToken);

    // Send the gasless programmable payload to Shinami Gas Station for sponsorship
    const sponsoredResponse = await sponsor.gas_sponsorTransactionBlock(gaslessPayloadBase64, walletAddress, GAS_BUDGET);

    // The transaction should be sponsored now, so its status will be "IN_FLIGHT"
    const sponsoredStatus = await sponsor.gas_getSponsoredTransactionBlockStatus(sponsoredResponse.txDigest);
    console.log("Sponsorship Status:", sponsoredStatus);

    // The sponsoredReponse will contain the full transaction payload and the signature of the gas object owner. To send it off for execution, 
    // the full transaction payload still needs to be signed by the sender of the transaction.

    // Sign the full transaction payload with the sender's key using wallet api
    const signature = await signTransactionBlock("<SENDER_WALLET_ID>", sessionToken, sponsoredResponse.txBytes);

 //   const senderSig = await signer.signTransactionBlock({transactionBlock: TransactionBlock.from(sponsoredResponse.txBytes)});
    
    // Send the full transaction payload, along with the gas owner and sender's signatures for execution on the sui network
    const executeResponse = await suiProvider.executeTransactionBlock(
        {
            transactionBlock: sponsoredResponse.txBytes,
            signature: [signature, sponsoredResponse.signature],
            options: {showEffects: true},
            requestType: 'WaitForLocalExecution'
        }
    );
    console.log("Execution Status:", executeResponse.effects?.status.status);
}

sponsorTransactionE2E();
