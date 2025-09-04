// 0. Import what we need to generate a funded sponsor account (see code below)
import {
    Account,
    AccountAddress,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    Network,
    PrivateKey,
    PrivateKeyVariants,
    SingleKeyAccount,
    SigningSchemeInput
} from "@aptos-labs/ts-sdk";
let fundedSenderAccount = null;

// **** 
// Code for generating a reusable, funded account for testing purposes

// Step 1: uncomment the next six lines. Save the file, transpile with tsc, and run with node build/gas_station.js
// const accountOne = SingleKeyAccount.generate({ scheme: SigningSchemeInput.Ed25519 });
// console.log("Sponsor address: ", accountOne.accountAddress.toString());
// console.log("Sponsor private key : ", PrivateKey.formatPrivateKey(Buffer.from(accountOne.privateKey.toUint8Array()).toString('hex'), PrivateKeyVariants.Ed25519));


// Step 2: 
//   a. Comment out the code in Step 1
//   b. Copy the "Sponsor address" and "Sponsor private key" that were printed to the terminal in step 1 and 
//        save in a text file so you dont forget during testing.
//   c. Visit the Movement Testnet faucet page at https://faucet.movementnetwork.xyz/ and request MOVE for the "Sponsor address"


// Step 3:
//   b. Uncomment the four code lines below.
//   c. Set the value of `PKEY_ONE` to the "Sponsor private key" value printed to the console in Step 1.

const PKEY_ONE = "ed25519-priv-0x...";
const fundedSenderAccountAddress = "Sponsor address";
fundedSenderAccount = new SingleKeyAccount({
    privateKey: new Ed25519PrivateKey(PKEY_ONE)
});

// ****


const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://testnet.bardock.movementnetwork.xyz/v1',
    faucet: 'https://faucet.testnet.bardock.movementnetwork.xyz/',
});
// Initialize the Aptos client
const aptos = new Aptos(config);


const tx = await aptos.transaction.build.simple({
    sender: fundedSenderAccountAddress,
    withFeePayer: false,
    data: {
        function: "0xe56b2729723446cd0836a7d1273809491030ccf2ec9935d598bfdf0bffee4486::message::set_message",
        functionArguments: ["hello"]
    }
});

const pendingTransaction = await aptos.signAndSubmitTransaction({
    signer: fundedSenderAccount,
    transaction: tx
});

// Wait for the transaction to execute and print its status 
const executedTransaction = await aptos.waitForTransaction({
    transactionHash: pendingTransaction.hash,
});
console.log("\nTransaction hash:", executedTransaction.hash);
console.log("Transaction status:", executedTransaction.vm_status);