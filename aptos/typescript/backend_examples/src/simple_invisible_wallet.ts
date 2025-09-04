// 0. Import what we need to generate a funded sponsor account (see code below)
import {
    Account,
    Ed25519PrivateKey,
    SingleKeyAccount,
    SigningSchemeInput,
    PrivateKey,
    PrivateKeyVariants,
    AccountAddress
} from "@aptos-labs/ts-sdk";
let fundedSenderAccount = null;

// **** 
// Code for generating a reusable, funded account for testing purposes

// Step 1: uncomment the next six lines. Save the file, transpile with tsc, and run with node build/gas_station.js
const accountOne = SingleKeyAccount.generate({ scheme: SigningSchemeInput.Ed25519 });
console.log("Sponsor address: ", accountOne.accountAddress.toString());
console.log("Sponsor private key : ", PrivateKey.formatPrivateKey(Buffer.from(accountOne.privateKey.toUint8Array()).toString('hex'), PrivateKeyVariants.Ed25519));

// End step 1

// Step 2: visit the Aptos Testnet faucet page at https://aptos.dev/en/network/faucet
//   and request APT for the address that was printed to the console from
//   step 1. You may need to refresh the page after your first request.
//   CAUTION: the faucet currently has a limit of 5 requests per day.


// Step 3:
//   a. Comment out the three lines from run 1.
//   b. Uncomment the four code lines below.
//   c. Set the value of `PKEY_ONE` to the private key value printed to the console in Step 1.

// const PKEY_ONE = "ed25519-priv-0x...";
// fundedSenderAccount = new SingleKeyAccount({
//     privateKey: new Ed25519PrivateKey(PKEY_ONE)
// });

// End step 3

// ****



// 1. Import everything we need from Shinami wallet management
import {
    KeyClient,
    WalletClient,
    createAptosClient
} from "@shinami/clients/aptos";

// 2. Copy your access key value
const APTOS_WALLET_KEY = "API_KEY";
const APTOS_NODE_KEY = "API_KEY";

// 3. Set up a walletId and its associated secret. We're using a fixed example of one test user's wallet. Your
//    app should figure out the best way to manage its wallet IDs and secrets.
const WALLET_ID_1 = "wallet_id_1";
const WALLET_SECRET_1 = "wallet_secret_1";

// 4. Instantiate your Shinami clients for Invisible Wallet Service
const keyClient = new KeyClient(APTOS_WALLET_KEY);
const walletClient = new WalletClient(APTOS_WALLET_KEY);

// 5. Insitatiate a node client with some Node Service (here, Shinami)
const aptosClient = createAptosClient(APTOS_NODE_KEY);


if (fundedSenderAccount != null) {

    // 6. Generate a session token with the wallet key (expires after 10 min, or can be regenerated before each wallet request)
    const sessionToken = await keyClient.createSession(WALLET_SECRET_1);


    let walletAccountAddress = null;
    // 7. Try to create an uninitialized wallet. This error will be thrown if it's already been created:
    //       JSONRPCError: Resource already exists
    //       code: -32013
    //       data: { details: "Wallet ID already exists, use 'getWallet' to retrieve the address" }
    // 

    try {
        walletAccountAddress = await walletClient.createWallet(WALLET_ID_1, sessionToken);
    } catch (error: unknown) {
        console.log(error);
    }

    // 8. Check if the wallet exists. This error will be thrown if it doesn't exist:
    //       JSONRPCError: Invalid params
    //       code: -32602
    //       data: { details: 'Wallet ID not found' }
    try {
        walletAccountAddress = await walletClient.getWallet(WALLET_ID_1);
    } catch (error: unknown) {
        console.log(error);
    }

    console.log("Sender address (Shinami Invisible Wallet): ", walletAccountAddress?.toString());

    if (walletAccountAddress != null) {
        // 9. Build a feePayer transaction
        const feePayerTx = await aptosClient.transaction.build.simple({
            sender: walletAccountAddress,
            withFeePayer: true,
            data: {
                function: "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::set_message",
                functionArguments: ["hello"]
            }
        });

        // 10. Sign the transaction with the sender wallet
        const senderSignature = await walletClient.signTransaction(WALLET_ID_1, sessionToken, feePayerTx);

        // 11. Have the sponsor sign the transaction and submit it
        const pendingTransaction = await aptosClient.transaction.signAndSubmitAsFeePayer({
            feePayer: fundedSenderAccount,
            senderAuthenticator: senderSignature,
            transaction: feePayerTx
        });

        // 12. Wait for the transaction to execute and print its status 
        const executedTransaction = await aptosClient.waitForTransaction({
            transactionHash: pendingTransaction.hash,
        });
        console.log("\nTransaction hash:", executedTransaction.hash);
        console.log("Transaction status:", executedTransaction.vm_status);
    }
}
