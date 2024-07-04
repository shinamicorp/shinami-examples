// 1. Import everything we need for the tutorial
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { KeyClient, WalletClient, ShinamiWalletSigner } from "@shinami/clients/aptos";
// 2. Copy your access key value
const ALL_SERVICES_TESTNET_ACCESS_KEY = "aptos_testnet_b8d61d8a759e83dbca877c7c93a444eb"; //"{{allServicesTestnetAccessKey}}";
// 3. Set up a walltId an its associated secret
const WALLET_ID = "id_2"; // "{{walletID}}";
const WALLET_SECRET = "secret_2"; // "{{walletSecret}}";
// 4. Instantiate your Aptos and Shinami clients
const aptosClient = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const KEY_RPC_URL_DEVNET = "https://api.dev.shinami.com/aptos/key/v1"; // remove me
const WALLET_RPC_URL_DEVNET = "https://api.dev.shinami.com/aptos/wallet/v1"; // remove me
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY, KEY_RPC_URL_DEVNET);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY, WALLET_RPC_URL_DEVNET);
// 5. Create a ShinamiWalletSinger to more easily manage the Invisible Wallet
const signer = new ShinamiWalletSigner(WALLET_ID, walletClient, WALLET_SECRET, keyClient);
// 6. Create the Invisible Wallet
const CREATE_WALLET_IF_NOT_FOUND = true;
const INITIALIZE_ON_CHAIN = false;
const walletAddress = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND, INITIALIZE_ON_CHAIN);
// 7. Sponsor and execute a transaction for the Invisible Wallet
const simpleTx = await simpleMoveCallTransaction(walletAddress);
const pendingTx = await signer.executeGaslessTransaction(simpleTx);
const executedTransaction = await aptosClient.waitForTransaction({
    transactionHash: pendingTx.hash
});
console.log("\nTransaction hash:", executedTransaction.hash);
console.log("Transaction status:", executedTransaction.vm_status);
// Build a SimpleTransaction that makes a Move call to a Testnet module.
async function simpleMoveCallTransaction(sender, withFeePayer = true) {
    return await aptosClient.transaction.build.simple({
        sender: sender,
        withFeePayer: withFeePayer,
        data: {
            function: "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::set_message",
            functionArguments: ["hello"]
        }
    });
}
