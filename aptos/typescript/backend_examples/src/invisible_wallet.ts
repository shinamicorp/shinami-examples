// 1. Import everything we need for the tutorial
import { 
    AccountAddress,
    AccountAuthenticatorEd25519,
    Aptos, 
    AptosConfig, 
    Network, 
    SimpleTransaction 
} from "@aptos-labs/ts-sdk";
import { 
    KeyClient, 
    WalletClient, 
    ShinamiWalletSigner  
} from "@shinami/clients/aptos";

// 2. Copy your access key value
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}";

// 3. Set up a walletId and its associated secret. Just for the tutorial. Your
//    app should figure out the best way to manage its wallet Ids and secrets.
const WALLET_ID = "{{walletID}}";
const WALLET_SECRET = "{{walletSecret}}";

// 4. Instantiate your Aptos and Shinami clients
const aptosClient = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// 5. Create a ShinamiWalletSinger to more easily manage the Invisible Wallet
const signer = new ShinamiWalletSigner(
    WALLET_ID,
    walletClient,
    WALLET_SECRET,
    keyClient
);

// 6. Create the Invisible Wallet. We don't need to initialize it on Testnet 
//    here because the next action for the wallet is a transaction where it is
//    the sender and your Gas Station fund is the fee payer. This transaction
//    will initialize it on Testnet.
const CREATE_WALLET_IF_NOT_FOUND = true;
const INITIALIZE_ON_CHAIN = false; 
const walletAddress = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND, INITIALIZE_ON_CHAIN);

// 7. Sponsor and execute a transaction for the Invisible Wallet. This requires
//     the Gas Station fund associated with this access key to have sufficient 
//     APT to pay for the transaction.
const simpleTx = await simpleMoveCallTransaction(walletAddress); 
const pendingTx = await signer.executeGaslessTransaction(simpleTx);

const executedTransaction = await aptosClient.waitForTransaction({
    transactionHash: pendingTx.hash
});
console.log("\nTransaction hash:", executedTransaction.hash);
console.log("Transaction status:", executedTransaction.vm_status);

// 8. (optional) Uncomment the next line to sign a transaction and verify the signature:
// await signAndVerifyTransaction(signer, aptosClient);



// Build a SimpleTransaction that makes a Move call to a Testnet module.
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



// Sign a non-fee-payer transaction with an Invisible Wallet and verify the signature
async function signAndVerifyTransaction(signer: ShinamiWalletSigner, aptosClient: Aptos): Promise<void> {
    // 1. Generate a transaction where an Invisible Wallet is the sender and fee payer. 
    //    We ensure that the wallet is initialized on chain, because it must be in 
    //    order to sign the transaction below.
    const CREATE_WALLET_IF_NOT_FOUND = true;
    const INITIALIZE_ON_CHAIN = true;
    const walletAddress = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND, INITIALIZE_ON_CHAIN);
    const WITH_FEE_PAYER = false;
    const transaction = await simpleMoveCallTransaction(walletAddress, WITH_FEE_PAYER);

    // 2. Sign the transaction
    const accountAuthenticator = await signer.signTransaction(transaction);

    // 3. Verify the signature.
    const signingMessage = aptosClient.getSigningMessage({ transaction });
    const accountAuthenticatorEd25519 = accountAuthenticator as AccountAuthenticatorEd25519;
    const verifyResult = accountAuthenticatorEd25519.public_key.verifySignature(
      {
        message: signingMessage,
        signature: accountAuthenticatorEd25519.signature,
      },
    );
    console.log("\nInvisible Wallet signature was valid:", verifyResult);
}
