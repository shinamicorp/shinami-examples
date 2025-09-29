// 1. Import everything we need for the tutorial
import {
    AccountAddress,
    AccountAuthenticatorEd25519,
    PendingTransactionResponse,
    SimpleTransaction
} from "@aptos-labs/ts-sdk";
import {
    KeyClient,
    WalletClient,
    ShinamiWalletSigner,
    GasStationClient,
    createAptosClient
} from "@shinami/clients/aptos";

// 2. Copy your access key value. Must have rights to all Aptos services on Testnet.
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}";

// 3. Set up a walletId and its associated secret. Just for the tutorial. Your
//    app should figure out the best way to manage its wallet IDs and secrets.
const WALLET_ID = "{{walletID}}";
const WALLET_SECRET = "{{walletSecret}}";

// 4. Instantiate your Shinami clients
const aptosClient = createAptosClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
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
//    would initailize an un-initialized wallet. However, we are explicitly
//    initializing it now in case you only run the `signAndVerifyTransaction` 
//    function, because a wallet must be initialized in order to sign a transaction.
//    This requires the Gas Station fund associated with this access key to have 
//    sufficient APT to pay for the initialization transaction, as well as the 
//    transaction we execute below.
const CREATE_WALLET_IF_NOT_FOUND = true;
const INITIALIZE_ON_CHAIN = true;
const walletAddress = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND, INITIALIZE_ON_CHAIN);

// 7. Generate a feePayer transaction where an Invisible Wallet is the sender  
const simpleTx = await simpleMoveCallTransaction(walletAddress);

// 8. Sign, sponsor, and submit the transaction
const pendingTx =
    await signer.executeGaslessTransaction(simpleTx);
// await signSponsorAndSubmitTransactionInTwoSteps(signer, simpleTx)

// 9. Wait for the transaction to execute and print its status 
const executedTransaction = await aptosClient.waitForTransaction({
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
    return await aptosClient.transaction.build.simple({
        sender: sender,
        withFeePayer: withFeePayer,
        data: {
            function: "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::set_message",
            functionArguments: ["hello"]
        }
    });
}


//
// Sign, sponsor and submit a transaction in two steps.
//
async function signSponsorAndSubmitTransactionInTwoSteps(onChainWalletSigner: ShinamiWalletSigner,
    transaction: SimpleTransaction): Promise<PendingTransactionResponse> {

    // 1. Generate the sender signature (from an Invisible Wallet that's been initialized on chain)
    const senderSignature = await onChainWalletSigner.signTransaction(transaction);

    // 2. Ask Shinami to sponsor and submit the transaction. 
    //     You could also break this into two steps with a call to 
    //     `gasClient.sponsorTransaction()` and then `aptosClient.transaction.submit.simple()`
    return await gasClient.sponsorAndSubmitSignedTransaction(transaction, senderSignature);
}



//
// Sign a transaction with an Invisible Wallet and verify the signature.
//
async function signAndVerifyTransaction(onChainWalletSigner: ShinamiWalletSigner,
    transaction: SimpleTransaction): Promise<void> {

    // 1. Generate the sender signature (from an Invisible Wallet that's been initialized on chain)
    const accountAuthenticator = await onChainWalletSigner.signTransaction(transaction);

    // 2. Verify the signature.
    const signingMessage = aptosClient.getSigningMessage({ transaction });
    const accountAuthenticatorEd25519 = accountAuthenticator as AccountAuthenticatorEd25519;
    const verifyResult = accountAuthenticatorEd25519.public_key.verifySignature(
        {
            message: signingMessage,
            signature: accountAuthenticatorEd25519.signature
        }
    );
    console.log("\nInvisible Wallet signature was valid:", verifyResult);
}
