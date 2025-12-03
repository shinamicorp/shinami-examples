// 1. Import everything we need for the tutorial
import {
    AccountAddress,
    AccountAuthenticatorEd25519,
    Aptos,
    AptosConfig,
    Network,
    PendingTransactionResponse,
    SimpleTransaction
} from "@aptos-labs/ts-sdk";
import {
    KeyClient,
    WalletClient,
    ShinamiWalletSigner,
    GasStationClient
} from "@shinami/clients/aptos";

// 2. Copy your access key value. Must have rights to both Movement Gas Station and Wallet Services on Testnet.
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}";

// 3. Set up a walletId and its associated secret. Just for the tutorial. Your
//    app should figure out the best way to manage its wallet IDs and secrets.
const WALLET_ID = "{{walletID}}";
const WALLET_SECRET = "{{walletSecret}}";

// 4a. Instantiate your Movement client
const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://testnet.movementnetwork.xyz/v1',
    faucet: 'https://faucet.testnet.movementnetwork.xyz/',
});
const movementClient = new Aptos(config);

// 4b. Instantiate your Shinami clients
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
// Only required for `signSponsorAndSubmitTransactionInTwoSteps` example:
const gasClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// 5. Create a ShinamiWalletSinger to more easily manage the Invisible Wallet
const signer = new ShinamiWalletSigner(
    WALLET_ID,
    walletClient,
    WALLET_SECRET,
    keyClient
);

// 6. Create the Invisible Wallet. The call to `executeGaslessTransaction` below
//    will initailize an un-initialized wallet, so we do not need to pre-initialize 
//    a wallet we create.
const CREATE_WALLET_IF_NOT_FOUND = true;
const INITIALIZE_ON_CHAIN = false;
const walletAddress = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND, INITIALIZE_ON_CHAIN);
console.log("Invisible wallet address: ", walletAddress.toString());

// 7. Generate a feePayer transaction where an Invisible Wallet is the sender  
const simpleTx = await simpleMoveCallTransaction(walletAddress);

// 8. Sign, sponsor, and submit the transaction
const pendingTx =
    await signer.executeGaslessTransaction(simpleTx);
// await signSponsorAndSubmitTransactionInTwoSteps(signer, simpleTx)

// 9. Wait for the transaction to execute and print its status 
const executedTransaction = await movementClient.waitForTransaction({
    transactionHash: pendingTx.hash
});
console.log("\nTransaction hash:", executedTransaction.hash);
console.log("Transaction status:", executedTransaction.vm_status);

// 10. (optional) Uncomment the next line to sign a transaction and verify the signature:
// await signAndVerifyTransaction(signer, simpleTx);



/// -- END OF TUTORIAL STEPS -- ///



//
// Build a SimpleTransaction with a fee payer. The transaction calls a function 
//  on a Move module we've deployed to Testnet.
//
async function simpleMoveCallTransaction(sender: AccountAddress, withFeePayer = true): Promise<SimpleTransaction> {
    return await movementClient.transaction.build.simple({
        sender: sender,
        withFeePayer: withFeePayer,
        data: {
            function: "0xe56b2729723446cd0836a7d1273809491030ccf2ec9935d598bfdf0bffee4486::message::set_message",
            functionArguments: ["test_message"]
        }
    });
}


//
// Sign, sponsor and submit a transaction in two steps.
//
async function signSponsorAndSubmitTransactionInTwoSteps(walletSigner: ShinamiWalletSigner,
    transaction: SimpleTransaction): Promise<PendingTransactionResponse> {

    // 1. Generate the sender signature 
    const senderSignature = await walletSigner.signTransaction(transaction);

    // 2. Ask Shinami to sponsor and submit the transaction. 
    //     You could also break this into two steps with a call to 
    //     `gasClient.sponsorTransaction()` and then `movementClient.transaction.submit.simple()`
    return await gasClient.sponsorAndSubmitSignedTransaction(transaction, senderSignature);
}



//
// Sign a transaction with an Invisible Wallet and verify the signature.
//
async function signAndVerifyTransaction(walletSigner: ShinamiWalletSigner,
    transaction: SimpleTransaction): Promise<void> {

    // 1. Generate the sender signature
    const accountAuthenticator = await walletSigner.signTransaction(transaction);

    // 2. Verify the signature.
    const signingMessage = movementClient.getSigningMessage({ transaction });
    const accountAuthenticatorEd25519 = accountAuthenticator as AccountAuthenticatorEd25519;
    const verifyResult = accountAuthenticatorEd25519.public_key.verifySignature(
        {
            message: signingMessage,
            signature: accountAuthenticatorEd25519.signature
        }
    );
    console.log("\nInvisible Wallet signature was valid:", verifyResult);
}
