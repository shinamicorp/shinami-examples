import { 
    Aptos, 
    AptosConfig,
    Network, 
    SingleKeyAccount, 
    AccountAddress, 
    SimpleTransaction,
    MultiAgentTransaction,
    MoveString,
    SigningSchemeInput,
    PendingTransactionResponse
} from "@aptos-labs/ts-sdk";
import { readFileSync } from "fs";
import { GasStationClient } from "@shinami/clients/aptos";

// Create an Aptos client for building and submitting our transactions.
const aptosClient = new Aptos(new AptosConfig({ network: Network.TESTNET}));

// Create a Shinami Gas Station client for sponsoring our transactions.
const SHINAMI_TESTNET_GAS_KEY = "{{APTOS_TESTNET_GAS_STATION_ACCESS_KEY}}";
const gasStationClient = new GasStationClient(SHINAMI_TESTNET_GAS_KEY);

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
    const executedTransaction = await aptosClient.waitForTransaction({
        transactionHash: committedTransaction.hash
      });
    console.log("\nTransaction hash:", executedTransaction.hash);
    console.log("Transaction status:", executedTransaction.vm_status);
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
// Helper function to generate a SingleKeyAccount for easy use with this tutorial.
//  If the argument is set to true, the account will be funded.
//  Not meant as best practice - your app should have its own way of managing Accounts and keys.
//
async function generateSingleKeyAccountEd25519(fund = false) : Promise<SingleKeyAccount> {
    const account: SingleKeyAccount = SingleKeyAccount.generate({ scheme: SigningSchemeInput.Ed25519});
    if (fund) {
        await aptosClient.fundAccount({
            accountAddress: account.accountAddress,
            amount: 100000000
        });
    }
    return account;
}


//
// Build a Move call simple transaction with a fee payer
//
async function buildSimpleMoveCallTransaction(sender: AccountAddress, expirationSeconds?: number): Promise<SimpleTransaction> {

    let transaction =  await aptosClient.transaction.build.simple({
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
    expirationSeconds?: number) : Promise<MultiAgentTransaction> {

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



//
// Check a fund's balance and deposit more SUI in the fund if it's low
//
async function checkFundBalanceAndDepositIfNeeded(): Promise<PendingTransactionResponse | undefined> {
    const MIN_FUND_BALANCE_OCTA = 1_000_000_000; // 10 APT
    const { balance, inFlight, depositAddress }  = await gasStationClient.getFund();

    // You'll want more than 1000 Octa, and what you want may be dynamic based on the
    //  (balance - inFlight) and other things. This is just an example.
    const STANDARD_DEPOSIT_AMOUNT = 1000; 
    
    // Deposit address can be null - see our FAQ for how to generate an address: 
    //   https://docs.shinami.com/docs/faq#how-do-i-generate-and-find-the-deposit-address-of-a-fund
    if (depositAddress && ((balance - inFlight) < MIN_FUND_BALANCE_OCTA)) {

        //  Generate a funded account to act as sender. In a real example,
        //  you'd already have a funded account for your app that you'd use.
        const sender = await generateSingleKeyAccountEd25519(true); 


        const transferTx = await aptosClient.transferCoinTransaction({
            sender: sender.accountAddress,
            recipient: depositAddress,
            amount: STANDARD_DEPOSIT_AMOUNT
        });

        const senderAuth = await sender.signTransactionWithAuthenticator(transferTx);

        return await aptosClient.transaction.submit.simple({
            transaction: transferTx,
            senderAuthenticator: senderAuth
        });
    }

    console.log("No deposit because no deposit address or a balance above the minimum you've set.");
    return undefined;
}
