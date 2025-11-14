import {
    AccountAddress,
    Aptos,
    AptosConfig,
    Ed25519PrivateKey,
    MoveString,
    MultiAgentTransaction,
    Network,
    PendingTransactionResponse,
    PrivateKey,
    PrivateKeyVariants,
    SigningSchemeInput,
    SimpleTransaction,
    SingleKeyAccount
} from "@aptos-labs/ts-sdk";
import { readFileSync } from "fs";
import { GasStationClient } from "@shinami/clients/aptos";

// Create a Shinami Gas Station client for sponsoring transactions 
//  and a Movement node client for building and submitting them.
//  You'll need an access key with Gas Station rights on Testnet.
const SHINAMI_TESTNET_GAS_STATION_API_KEY = "{{MOVEMENT_TESTNET_GAS_STATION_API_ACCESS_KEY}}";
const gasStationClient = new GasStationClient(SHINAMI_TESTNET_GAS_STATION_API_KEY);

// Initialize the Movement client
const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://testnet.movementnetwork.xyz/v1',
    faucet: 'https://faucet.testnet.movementnetwork.xyz/',
});
const movementClient = new Aptos(config);


// **** 
// Code for generating two reusable, funded accounts for testing purposes

// Step 1: uncomment the next six lines of code. Save the file, transpile with tsc, and run with node build/gas_station.js

// const accountOne = await generateSingleKeyAccountEd25519();
// console.log("Address 1: ", accountOne.accountAddress.toString());
// console.log("Private key 1: ", PrivateKey.formatPrivateKey(Buffer.from(accountOne.privateKey.toUint8Array()).toString('hex'), PrivateKeyVariants.Ed25519));
// const accountTwo = await generateSingleKeyAccountEd25519();
// console.log("Address 2: ", accountTwo.accountAddress.toString());
// console.log("Private key 2: ", PrivateKey.formatPrivateKey(Buffer.from(accountTwo.privateKey.toUint8Array()).toString('hex'), PrivateKeyVariants.Ed25519));


// Step 2: visit the Movement Testnet faucet page at https://faucet.movementnetwork.xyz/ and 
//   request MOVE for each of the two addresses that were printed to the console from step 1.


// Step 3:
//   a. Comment out the six lines from run 1.
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


// ****

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
async function sponsorTransactionSimple(): Promise<PendingTransactionResponse> {

    // 1. Set up our sender.
    const sender = await generateSingleKeyAccountEd25519();

    // 2. Build a simple transaction.
    let transaction = await buildSimpleMoveCallTransaction(sender.accountAddress);

    // 3. Sponsor the transaction with Shinami Gas Station.
    let feePayerAuthenticator = await gasStationClient.sponsorTransaction(transaction);
    // Note that the SDK updates the transaction's feePayer address on a successful sponsorship
    console.log("\ntransaction.feePayerAddress post-sponsorship:", transaction.feePayerAddress);

    // 4. Generate the sender's signature. 
    const senderAuthenticator = movementClient.transaction.sign({
        signer: sender,
        transaction: transaction
    });

    // 5. Submit the transaction with the sender and fee payer signatures
    return await movementClient.transaction.submit.simple({
        transaction,
        senderAuthenticator,
        feePayerAuthenticator: feePayerAuthenticator,
    });
}


//
// Build, sponsor, sign, and execute a multiAgent Move script transaction
//
async function sponsorTransactionMultiAgent(fundedSenderAccount: SingleKeyAccount, fundedSecondarySigner: SingleKeyAccount): Promise<PendingTransactionResponse> {

    // 1. Build a multiAgent transaction
    let transaction = await buildMultiAgentScriptTransaction(fundedSenderAccount.accountAddress, fundedSecondarySigner.accountAddress);

    // 2. Sponsor the transaction with Shinami Gas Station
    let feePayerAuthenticator = await gasStationClient.sponsorTransaction(transaction);
    // Note that the SDK updates the transaction's feePayer address on a successful sponsorship
    console.log("\ntransaction.feePayerAddress post-sponsorship:", transaction.feePayerAddress);

    // 3. Generate the sender and secondary signer signatures
    const senderAuthenticator = movementClient.transaction.sign({
        signer: fundedSenderAccount,
        transaction
    });

    const secondarySignerAuthenticator = movementClient.transaction.sign({
        signer: fundedSecondarySigner,
        transaction
    });

    // 4. Submit the transaction with the sender, seconardy signer, and feePayer signatures
    return await movementClient.transaction.submit.multiAgent({
        transaction,
        senderAuthenticator,
        additionalSignersAuthenticators: [secondarySignerAuthenticator],
        feePayerAuthenticator: feePayerAuthenticator
    });
}


//
// Build, sign, then sponsor and submit a simple transaction
//
async function sponsorAndSubmitSignedTransactionSimple(): Promise<PendingTransactionResponse> {
    // 1. Set up our sender.
    const sender = await generateSingleKeyAccountEd25519();

    // 2. Build a simple transaction.
    const transaction = await buildSimpleMoveCallTransaction(sender.accountAddress);

    // 3. Generate the sender's signature. 
    const senderAuthenticator = movementClient.transaction.sign({
        signer: sender,
        transaction
    });

    // 4. Ask Shinami to sponsor and submit the transaction
    return await gasStationClient.sponsorAndSubmitSignedTransaction(
        transaction,
        senderAuthenticator
    );
}


//
// Build, sign, then sponsor and submit a multiAgent transaction
//
async function sponsorAndSubmitSignedTransactionMultiAgent(fundedSenderAccount: SingleKeyAccount, fundedSecondarySigner: SingleKeyAccount): Promise<PendingTransactionResponse> {

    // 1. Build a multiAgent transaction
    let transaction = await buildMultiAgentScriptTransaction(fundedSenderAccount.accountAddress, fundedSecondarySigner.accountAddress);

    // 2. Generate the sender and secondary signer signatures
    const senderAuthenticator = movementClient.transaction.sign({
        signer: fundedSenderAccount,
        transaction
    });

    const secondarySignerAuthenticator = movementClient.transaction.sign({
        signer: fundedSecondarySigner,
        transaction
    });

    // 3. Ask Shinami to sponsor and submit the transaction
    return await gasStationClient.sponsorAndSubmitSignedTransaction(
        transaction,
        senderAuthenticator,
        [secondarySignerAuthenticator]
    );
}


//
// Check a fund's balance and deposit more MOVE in the fund if it's low
//
async function checkFundBalanceAndDepositIfNeeded(fundedSenderAccount: SingleKeyAccount): Promise<PendingTransactionResponse | undefined> {
    const MIN_FUND_BALANCE_OCTA = 1_000_000_000; // 10 MOVE
    const { balance, inFlight, depositAddress } = await gasStationClient.getFund();
    console.log("Fund balance not in use (in Move):", (balance - inFlight) / 100_000_000);

    // You'll want to deposit more than 1000 Octa, and what you want may be dynamic based on the
    //  current (balance - inFlight) amount, etc. This is just a simple example.
    const STANDARD_DEPOSIT_AMOUNT = 1000;

    // Deposit address can be null - see our Help Center for how to generate an address: 
    //   https://docs.shinami.com/help-center/movement/gas-station-faq#how-do-i-generate-and-find-the-deposit-address-of-a-fund%3F
    if (depositAddress && ((balance - inFlight) < MIN_FUND_BALANCE_OCTA)) {
        // Create a SimpleTransaction that transfers MOVE from the sender to your Gas Station fund
        const transferTx = await movementClient.transferCoinTransaction({
            sender: fundedSenderAccount.accountAddress,
            recipient: depositAddress,
            amount: STANDARD_DEPOSIT_AMOUNT
        });

        // Obtain the sender's signature
        const senderAuth = fundedSenderAccount.signTransactionWithAuthenticator(transferTx);

        // Submit the transaction
        return await movementClient.transaction.submit.simple({
            transaction: transferTx,
            senderAuthenticator: senderAuth
        });
    }

    console.log("No deposit because no deposit address or a balance above the minimum you've set.");
    return undefined;
}


//
// Helper function to generate a SingleKeyAccount for easy use with this tutorial.
//  Not meant as best practice - your app should have its own way of managing Accounts and keys.
//
async function generateSingleKeyAccountEd25519(): Promise<SingleKeyAccount> {
    return SingleKeyAccount.generate({ scheme: SigningSchemeInput.Ed25519 });
}


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
            functionArguments: ["test_message"]
        },
        options: {
            expireTimestamp: expirationSeconds
        }
    });

    console.log("\nResponse from movementClient.transaction.build.simple()");
    console.log(transaction);
    return transaction;
}



//
// Build a multi-agent script transaction with one secondary signer and a fee payer.
//
async function buildMultiAgentScriptTransaction(sender: AccountAddress, secondarySigner: AccountAddress, expirationSeconds?: number): Promise<MultiAgentTransaction> {

    let buffer = readFileSync("./move/build/test/bytecode_scripts/unfair_swap_coins.mv");
    let bytecode = Uint8Array.from(buffer);

    let transaction = await movementClient.transaction.build.multiAgent({
        sender: sender,
        secondarySignerAddresses: [secondarySigner],
        withFeePayer: true,
        data: {
            bytecode: bytecode,
            functionArguments: []
        },
        options: {
            expireTimestamp: expirationSeconds
        }
    });

    console.log("\nResponse from movementClient.transaction.build.multiAgent()");
    console.log(transaction);
    return transaction;
}
