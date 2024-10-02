import {
    SingleKeyAccount,
    AccountAddress,
    SimpleTransaction,
    MultiAgentTransaction,
    MoveString,
    SigningSchemeInput,
    PendingTransactionResponse
} from "@aptos-labs/ts-sdk";
import { readFileSync } from "fs";
import { GasStationClient, createAptosClient } from "@shinami/clients/aptos";

// Create a Shinami Gas Station client for sponsoring our transactions 
//  and a Shinami REST API client for building and submitting them.
const SHINAMI_TESTNET_GAS_AND_REST_API_KEY = "{{APTOS_TESTNET_GAS_STATION_AND_REST_API_ACCESS_KEY}}";
const gasStationClient = new GasStationClient(SHINAMI_TESTNET_GAS_AND_REST_API_KEY);
const aptosClient = createAptosClient(SHINAMI_TESTNET_GAS_AND_REST_API_KEY);

//
// -- Choose which sample code function to use to generate a PendingTransactionResponse //
//
const committedTransaction = await
    sponsorTransactionSimple();
// sponsorTransactionMultiAgent();
// sponsorAndSubmitSignedTransactionSimple();
// sponsorAndSubmitSignedTransactionMultiAgent();
// checkFundBalanceAndDepositIfNeeded();


// Wait for the transaction to move past the pending state 
if (committedTransaction) {
    console.log("Polling for tx hash: ", committedTransaction.hash);
    const executedTransaction = await aptosClient.waitForTransaction({
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
    const senderAuthenticator = aptosClient.transaction.sign({
        signer: sender,
        transaction: transaction
    });

    // 5. Submit the transaction with the sender and fee payer signatures
    return await aptosClient.transaction.submit.simple({
        transaction,
        senderAuthenticator,
        feePayerAuthenticator: feePayerAuthenticator,
    });
}


//
// Build, sponsor, sign, and execute a multiAgent Move script transaction
//
async function sponsorTransactionMultiAgent(): Promise<PendingTransactionResponse> {

    // 1. Generate two funded accounts to act as sender and secondary signer
    const sender = await generateSingleKeyAccountEd25519(true);
    const secondarySigner = await generateSingleKeyAccountEd25519(true);

    // 2. Build a multiAgent transaction
    let transaction = await buildMultiAgentScriptTransaction(sender.accountAddress, secondarySigner.accountAddress);

    // 3. Sponsor the transaction with Shinami Gas Station
    let feePayerAuthenticator = await gasStationClient.sponsorTransaction(transaction);
    // Note that the SDK updates the transaction's feePayer address on a successful sponsorship
    console.log("\ntransaction.feePayerAddress post-sponsorship:", transaction.feePayerAddress);

    // 4. Generate the sender and secondary signer signatures
    const senderAuthenticator = aptosClient.transaction.sign({
        signer: sender,
        transaction
    });

    const secondarySignerAuthenticator = aptosClient.transaction.sign({
        signer: secondarySigner,
        transaction
    });

    // 5. Submit the transaction with the sender, seconardy signer, and feePayer signatures
    return await aptosClient.transaction.submit.multiAgent({
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
    const senderAuthenticator = aptosClient.transaction.sign({
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
async function sponsorAndSubmitSignedTransactionMultiAgent(): Promise<PendingTransactionResponse> {
    // 1. Generate two funded accounts to act as sender and secondary signer
    const sender = await generateSingleKeyAccountEd25519(true);
    const secondarySigner = await generateSingleKeyAccountEd25519(true);

    // 2. Build a multiAgent transaction
    let transaction = await buildMultiAgentScriptTransaction(sender.accountAddress, secondarySigner.accountAddress);

    // 3. Generate the sender and secondary signer signatures
    const senderAuthenticator = aptosClient.transaction.sign({
        signer: sender,
        transaction
    });

    const secondarySignerAuthenticator = aptosClient.transaction.sign({
        signer: secondarySigner,
        transaction
    });

    // 4. Ask Shinami to sponsor and submit the transaction
    return await gasStationClient.sponsorAndSubmitSignedTransaction(
        transaction,
        senderAuthenticator,
        [secondarySignerAuthenticator]
    );
}



//
// Check a fund's balance and deposit more APT in the fund if it's low
//
async function checkFundBalanceAndDepositIfNeeded(): Promise<PendingTransactionResponse | undefined> {
    const MIN_FUND_BALANCE_OCTA = 1_000_000_000; // 10 APT
    const { balance, inFlight, depositAddress } = await gasStationClient.getFund();

    // You'll want to deposit more than 1000 Octa, and what you want may be dynamic based on the
    //  current (balance - inFlight) amount, etc. This is just a simple example.
    const STANDARD_DEPOSIT_AMOUNT = 1000;

    // Deposit address can be null - see our FAQ for how to generate an address: 
    //   https://docs.shinami.com/docs/faq#how-do-i-generate-and-find-the-deposit-address-of-a-fund
    if (depositAddress && ((balance - inFlight) < MIN_FUND_BALANCE_OCTA)) {

        //  Generate a funded account to act as sender. In a real example,
        //  you'd already have a funded account for your app that you'd use.
        const sender = await generateSingleKeyAccountEd25519(true);

        // Create a SimpleTransaction that transfers APT from the sender to your Gas Station fund
        const transferTx = await aptosClient.transferCoinTransaction({
            sender: sender.accountAddress,
            recipient: depositAddress,
            amount: STANDARD_DEPOSIT_AMOUNT
        });

        // Obtain the sender's signature
        const senderAuth = sender.signTransactionWithAuthenticator(transferTx);

        // Submit the transaction
        return await aptosClient.transaction.submit.simple({
            transaction: transferTx,
            senderAuthenticator: senderAuth
        });
    }

    console.log("No deposit because no deposit address or a balance above the minimum you've set.");
    return undefined;
}



//
// Helper function to generate a SingleKeyAccount for easy use with this tutorial.
//  If the argument is set to true, the account will be funded.
//  Not meant as best practice - your app should have its own way of managing Accounts and keys.
//
async function generateSingleKeyAccountEd25519(fund = false): Promise<SingleKeyAccount> {
    const account: SingleKeyAccount = SingleKeyAccount.generate({ scheme: SigningSchemeInput.Ed25519 });
    if (fund) {
        const pendingTx = await aptosClient.fundAccount({
            accountAddress: account.accountAddress,
            amount: 100000000,
            options: {
                waitForIndexer: false
            }
        });
        // We wait for the funding transaction to be committed to the chain to make sure that
        //  our subsequent building and submitting of a transaction can use those funds. We've 
        //  assumed that the funding attempt was successful, but it may not be. A main reason is
        //  that there is a faucet rate limit per IP address per day.
        const fundingTx = await aptosClient.waitForTransaction({ transactionHash: pendingTx.hash });
    }
    return account;
}


// 
// Build a SimpleTransaction with a fee payer. The transaction calls a function 
//  on a Move module we've deployed to Testnet.
//
async function buildSimpleMoveCallTransaction(sender: AccountAddress, expirationSeconds?: number): Promise<SimpleTransaction> {

    let transaction = await aptosClient.transaction.build.simple({
        sender: sender,
        withFeePayer: true,
        data: {
            function: "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::set_message",
            functionArguments: [new MoveString("Test message")]
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
async function buildMultiAgentScriptTransaction(sender: AccountAddress, secondarySigner: AccountAddress,
    expirationSeconds?: number): Promise<MultiAgentTransaction> {

    let buffer = readFileSync("./move/build/test/bytecode_scripts/unfair_swap_coins.mv");
    let bytecode = Uint8Array.from(buffer);

    let transaction = await aptosClient.transaction.build.multiAgent({
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

    console.log("\nResponse from aptos.transaction.build.multiAgent()");
    console.log(transaction);
    return transaction;
}
