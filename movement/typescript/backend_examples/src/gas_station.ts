// 0. Import what we need to generate a funded sponsor account (see code below)
// import {
//     Account,
//     AccountAddress,
//     Aptos,
//     AptosConfig,
//     Ed25519PrivateKey,
//     Network,
//     PrivateKey,
//     PrivateKeyVariants,
//     SingleKeyAccount,
//     SigningSchemeInput
// } from "@aptos-labs/ts-sdk";
// let fundedSenderAccount = null;

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

// const PKEY_ONE = "ed25519-priv-0x...";
// const fundedSenderAccountAddress = "Sponsor address";
// fundedSenderAccount = new SingleKeyAccount({
//     privateKey: new Ed25519PrivateKey(PKEY_ONE)
// });

// ****



// const tx = await aptos.transaction.build.simple({
//     sender: fundedSenderAccountAddress,
//     withFeePayer: false,
//     data: {
//         function: "0xe56b2729723446cd0836a7d1273809491030ccf2ec9935d598bfdf0bffee4486::message::set_message",
//         functionArguments: ["hello"]
//     }
// });

// const pendingTransaction = await aptos.signAndSubmitTransaction({
//     signer: fundedSenderAccount,
//     transaction: tx
// });

// // Wait for the transaction to execute and print its status 
// const executedTransaction = await aptos.waitForTransaction({
//     transactionHash: pendingTransaction.hash,
// });
// console.log("\nTransaction hash:", executedTransaction.hash);
// console.log("Transaction status:", executedTransaction.vm_status);




import {
    Aptos,
    AptosConfig,
    SingleKeyAccount,
    AccountAddress,
    SimpleTransaction,
    MultiAgentTransaction,
    MoveString,
    Network,
    SigningSchemeInput,
    PendingTransactionResponse,
    Ed25519PrivateKey,
    PrivateKey,
    PrivateKeyVariants,
    AccountAuthenticator
} from "@aptos-labs/ts-sdk";
import axios from 'axios';
// import { readFileSync } from "fs";

// Create a Shinami Gas Station client for sponsoring our transactions 
//  and a Shinami REST API client for building and submitting them.
// const SHINAMI_TESTNET_GAS_AND_REST_API_KEY = "{{APTOS_TESTNET_GAS_STATION_AND_REST_API_ACCESS_KEY}}";
// const gasStationClient = new GasStationClient(SHINAMI_TESTNET_GAS_AND_REST_API_KEY);
// const movementClient = createmovementClient(SHINAMI_TESTNET_GAS_AND_REST_API_KEY);

// **** 
// Code for generating two reusable, funded accounts for testing purposes

// Step 1: uncomment the next six lines. Save the file, transpile with tsc, and run with node build/gas_station.js
const accountOne = SingleKeyAccount.generate({ scheme: SigningSchemeInput.Ed25519 });
console.log("Address 1: ", accountOne.accountAddress.toString());
console.log("Private key 1: ", PrivateKey.formatPrivateKey(Buffer.from(accountOne.privateKey.toUint8Array()).toString('hex'), PrivateKeyVariants.Ed25519));
const accountTwo = SingleKeyAccount.generate({ scheme: SigningSchemeInput.Ed25519 });
console.log("Address 2: ", accountTwo.accountAddress.toString());
console.log("Private key 2: ", PrivateKey.formatPrivateKey(Buffer.from(accountTwo.privateKey.toUint8Array()).toString('hex'), PrivateKeyVariants.Ed25519));

const SHINAMI_GAS_STATION_API = 'https://api.dev.shinami.com/movement/gas/v1/';
const HEADERS = {
    'X-API-Key': 'dev_movement_testnet_b04ca09113b84a5197733fe761220e2f',
    'Content-Type': 'application/json'
};

// End step 1

//  Step 2: Movement Testnet faucet page at https://faucet.movementnetwork.xyz/ and request
//   MOVE for each of the two addresses that were printed to the console from
//   step 1. You may need to refresh the page after your first request.


// Step 3:
//   a. Comment out the four lines from run 1.
//   b. Uncomment the eight code lines below.
//   c. Set the values of `PKEY_ONE` and `PKEY_TWO` to the private key values printed to the console in Step 1.
//   d. Save the file, transpile with tsc, and run with node build/gas_station.js

// const PKEY_ONE = "ed25519-priv-0x...";
// const fundedSenderAccount = new SingleKeyAccount({
//     privateKey: new Ed25519PrivateKey(PKEY_ONE)
// });
// const PKEY_TWO = "ed25519-priv-0x...";
// const fundedSecondarySignerAccount = new SingleKeyAccount({
//     privateKey: new Ed25519PrivateKey(PKEY_TWO)
// });

// End step 3

// ****


const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://testnet.bardock.movementnetwork.xyz/v1',
    faucet: 'https://faucet.testnet.bardock.movementnetwork.xyz/',
});
// Initialize the Aptos client
const movementClient = new Aptos(config);

//
// -- Choose which sample code function to use to generate a PendingTransactionResponse //
//
const committedTransaction = await
    sponsorTransactionSimple();
// sponsorTransactionMultiAgent(fundedSenderAccount, fundedSecondarySignerAccount);
// sponsorAndSubmitSignedTransactionSimple();
// sponsorAndSubmitSignedTransactionMultiAgent(fundedSenderAccount, fundedSecondarySignerAccount);
// checkFundBalanceAndDepositIfNeeded(fundedSenderAccount);


// Wait for the transaction to move past the pending state 
if (committedTransaction) {
    console.log("Polling for tx hash: ", committedTransaction.hash);
    const executedTransaction = await movementClient.waitForTransaction({
        transactionHash: committedTransaction.hash
    });
    console.log("Transaction status:", executedTransaction.vm_status);
} else {
    console.log("There was an issue with building and submitting the transaction.");
}


//
// Build, sponsor, sign, and execute a simple Move call transaction
//
async function sponsorTransactionSimple(): Promise<PendingTransactionResponse | null> {

    // 1. Set up our sender.
    const sender = await generateSingleKeyAccountEd25519();

    // 2. Build a simple transaction.
    let transaction = await buildSimpleMoveCallTransaction(sender.accountAddress);

    // 3. Sponsor the transaction with Shinami Gas Station.
    // let feePayerAuthenticator = await gasStationClient.sponsorTransaction(transaction);
    // // Note that the SDK updates the transaction's feePayer address on a successful sponsorship
    // console.log("\ntransaction.feePayerAddress post-sponsorship:", transaction.feePayerAddress);
    let feePayerAuthenticator = null;

    const resp = await axios.post(
        SHINAMI_GAS_STATION_API,
        {
            jsonrpc: '2.0',
            method: 'gas_sponsorTransaction',
            params: [
                transaction.bcsToHex().toString()
            ],
            id: 1
        },
        { headers: HEADERS }
    ).then(response => {
        console.log(response.data);
        feePayerAuthenticator = response.data.result;
    }).catch(error => {
        console.error(error);
    });

    // 4. Generate the sender's signature. 
    const senderAuthenticator = movementClient.transaction.sign({
        signer: sender,
        transaction: transaction
    });

    if (feePayerAuthenticator != null) {
        // 5. Submit the transaction with the sender and fee payer signatures
        return await movementClient.transaction.submit.simple({
            transaction,
            senderAuthenticator,
            feePayerAuthenticator: feePayerAuthenticator,
        });
    }
    return null;
}


//
// Build, sponsor, sign, and execute a multiAgent Move script transaction
//
// async function sponsorTransactionMultiAgent(fundedSenderAccount: SingleKeyAccount, fundedSecondarySigner: SingleKeyAccount): Promise<PendingTransactionResponse> {

//     // 1. Build a multiAgent transaction
//     let transaction = await buildMultiAgentScriptTransaction(fundedSenderAccount.accountAddress, fundedSecondarySigner.accountAddress);

//     // 2. Sponsor the transaction with Shinami Gas Station
//     let feePayerAuthenticator = await gasStationClient.sponsorTransaction(transaction);
//     // Note that the SDK updates the transaction's feePayer address on a successful sponsorship
//     console.log("\ntransaction.feePayerAddress post-sponsorship:", transaction.feePayerAddress);

//     // 3. Generate the sender and secondary signer signatures
//     const senderAuthenticator = movementClient.transaction.sign({
//         signer: fundedSenderAccount,
//         transaction
//     });

//     const secondarySignerAuthenticator = movementClient.transaction.sign({
//         signer: fundedSecondarySigner,
//         transaction
//     });

//     // 4. Submit the transaction with the sender, seconardy signer, and feePayer signatures
//     return await movementClient.transaction.submit.multiAgent({
//         transaction,
//         senderAuthenticator,
//         additionalSignersAuthenticators: [secondarySignerAuthenticator],
//         feePayerAuthenticator: feePayerAuthenticator
//     });
// }


//
// Build, sign, then sponsor and submit a simple transaction
//
// async function sponsorAndSubmitSignedTransactionSimple(): Promise<PendingTransactionResponse> {
//     // 1. Set up our sender.
//     const sender = await generateSingleKeyAccountEd25519();

//     // 2. Build a simple transaction.
//     const transaction = await buildSimpleMoveCallTransaction(sender.accountAddress);

//     // 3. Generate the sender's signature. 
//     const senderAuthenticator = movementClient.transaction.sign({
//         signer: sender,
//         transaction
//     });

//     // 4. Ask Shinami to sponsor and submit the transaction
//     return await gasStationClient.sponsorAndSubmitSignedTransaction(
//         transaction,
//         senderAuthenticator
//     );
// }


//
// Build, sign, then sponsor and submit a multiAgent transaction
//
// async function sponsorAndSubmitSignedTransactionMultiAgent(fundedSenderAccount: SingleKeyAccount, fundedSecondarySigner: SingleKeyAccount): Promise<PendingTransactionResponse> {

//     // 1. Build a multiAgent transaction
//     let transaction = await buildMultiAgentScriptTransaction(fundedSenderAccount.accountAddress, fundedSecondarySigner.accountAddress);

//     // 2. Generate the sender and secondary signer signatures
//     const senderAuthenticator = movementClient.transaction.sign({
//         signer: fundedSenderAccount,
//         transaction
//     });

//     const secondarySignerAuthenticator = movementClient.transaction.sign({
//         signer: fundedSecondarySigner,
//         transaction
//     });

//     // 3s. Ask Shinami to sponsor and submit the transaction
//     return await gasStationClient.sponsorAndSubmitSignedTransaction(
//         transaction,
//         senderAuthenticator,
//         [secondarySignerAuthenticator]
//     );
// }


//
// Check a fund's balance and deposit more APT in the fund if it's low
//
// async function checkFundBalanceAndDepositIfNeeded(fundedSenderAccount: SingleKeyAccount): Promise<PendingTransactionResponse | undefined> {
//     const MIN_FUND_BALANCE_OCTA = 1_000_000_000; // 10 APT
//     const { balance, inFlight, depositAddress } = await gasStationClient.getFund();

//     // You'll want to deposit more than 1000 Octa, and what you want may be dynamic based on the
//     //  current (balance - inFlight) amount, etc. This is just a simple example.
//     const STANDARD_DEPOSIT_AMOUNT = 1000;

//     // Deposit address can be null - see our Help Center for how to generate an address: 
//     //   https://docs.shinami.com/docs/aptos-gas-station-faq
//     if (depositAddress && ((balance - inFlight) < MIN_FUND_BALANCE_OCTA)) {
//         // Create a SimpleTransaction that transfers APT from the sender to your Gas Station fund
//         const transferTx = await movementClient.transferCoinTransaction({
//             sender: fundedSenderAccount.accountAddress,
//             recipient: depositAddress,
//             amount: STANDARD_DEPOSIT_AMOUNT
//         });

//         // Obtain the sender's signature
//         const senderAuth = fundedSenderAccount.signTransactionWithAuthenticator(transferTx);

//         // Submit the transaction
//         return await movementClient.transaction.submit.simple({
//             transaction: transferTx,
//             senderAuthenticator: senderAuth
//         });
//     }

//     console.log("No deposit because no deposit address or a balance above the minimum you've set.");
//     return undefined;
// }


// 
// Build a SimpleTransaction with a fee payer. The transaction calls a function 
//  on a Move module we've deployed to Testnet.
//
async function buildSimpleMoveCallTransaction(sender: AccountAddress, expirationSeconds?: number): Promise<SimpleTransaction> {

    let transaction = await movementClient.transaction.build.simple({
        sender: sender,
        withFeePayer: true,
        data: {
            function: "0xe56b2729723446cd0836a7d1273809491030ccf2ec9935d598bfdf0bffee4486::message::set_message",
            functionArguments: ["hello"]
        },
        options: {
            expireTimestamp: expirationSeconds
        }
    });

    console.log("\nResponse from aptos.transaction.build.simple()");
    console.log(transaction);
    return transaction;
}


//
// Build a multi-agent script transaction with one secondary signer and a fee payer.
//
// async function buildMultiAgentScriptTransaction(sender: AccountAddress, secondarySigner: AccountAddress,
//     expirationSeconds?: number): Promise<MultiAgentTransaction> {

//     let buffer = readFileSync("./move/build/test/bytecode_scripts/unfair_swap_coins.mv");
//     let bytecode = Uint8Array.from(buffer);

//     let transaction = await movementClient.transaction.build.multiAgent({
//         sender: sender,
//         secondarySignerAddresses: [secondarySigner],
//         withFeePayer: true,
//         data: {
//             bytecode: bytecode,
//             functionArguments: []
//         },
//         options: {
//             expireTimestamp: expirationSeconds
//         }
//     });

//     console.log("\nResponse from aptos.transaction.build.multiAgent()");
//     console.log(transaction);
//     return transaction;
// }

//
// Helper function to generate a SingleKeyAccount for easy use with this tutorial.
//  Not meant as best practice - your app should have its own way of managing Accounts and keys.
//
async function generateSingleKeyAccountEd25519(): Promise<SingleKeyAccount> {
    return SingleKeyAccount.generate({ scheme: SigningSchemeInput.Ed25519 });
}
