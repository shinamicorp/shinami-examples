import "../App.css";
import { useState } from "react"
import axios from 'axios';
import {
    PendingTransactionResponse,
    AptosConfig,
    Network,
    Aptos,
    UserTransactionResponse,
    SimpleTransaction,
    Deserializer,
    AccountAuthenticator,
    Hex
} from "@aptos-labs/ts-sdk";
import { getLocalKeylessAccount, deleteKeylessAccount } from "../keyless";
import GoogleLogout from 'react-google-button';


// Set up an Aptos client for submitting and fetching transactions
const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptosClient = new Aptos(aptosConfig);


const TransactionPage = () => {

    const [latestDigest, setLatestDigest] = useState<string>();
    const [latestResult, setLatestResult] = useState<string>();
    const [newSuccessfulResult, setnewSuccessfulResult] = useState<boolean>();
    const [keylessWalletAddress, setkeylessWalletAddress] = useState<string>();


    // 1. Get the user's input and update the page state.
    // 2. Build, sponsor, and execute a feePayer SimpleTransaction with the given user input. 
    //    If there is a connected wallet, represented by `currentAccount` having a value,
    //    then the connected wallet is the sender. Otherwise, the sender is a backend
    //    Shinami Invisible Wallet (hard coded for this very simple example app). 
    const executeTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setnewSuccessfulResult(false);
        const form = e.currentTarget
        const formElements = form.elements as typeof form.elements & {
            messageText: { value: string }
        };

        const message = formElements.messageText.value;
        let pendingTxResponse = undefined;
        try {
            pendingTxResponse = await keylessTxBEBuildFESubmit(message);

            if (pendingTxResponse?.hash) {
                waitForTxAndUpdateResult(pendingTxResponse.hash);
            } else {
                console.log("Unable to find a tx digest to search for.");
            }
        } catch (e) {
            console.log("error: ", e);
        }
    }


    // Poll the Full node represented by the Aptos client until the given digest
    // has been propagated to the node, and the node returns results for the digest.
    // Upon the response, update the page accordingly.
    const waitForTxAndUpdateResult = async (txHash: string) => {
        console.log("transaction: ", txHash);
        const executedTransaction = await aptosClient.waitForTransaction({
            transactionHash: txHash
        }) as UserTransactionResponse;

        if (executedTransaction.success) {
            for (var element in executedTransaction.events) {
                if (executedTransaction.events[element].type == "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::MessageChange") {
                    setLatestResult(executedTransaction.events[element].data.to_message);
                }
            }
            setLatestDigest(txHash);
            setnewSuccessfulResult(true);
        } else {
            console.log("Transaction did not execute successfully.");
        }
    }


    // 1. Ask the BE to build and sponsor a feePayer SimpleTransaction
    // 2. Sign the transaction with the user's Keyless wallet
    // 3. Submit the transaction
    const keylessTxBEBuildFESubmit = async (message: string): Promise<PendingTransactionResponse | undefined> => {
        console.log("keylessTxBEBuildFESubmit");

        // Step 1: Check for a Keyless Account in local storage
        const keylessAccount = getLocalKeylessAccount();
        if (keylessAccount) {
            if (keylessAccount.ephemeralKeyPair.isExpired()) {
                console.log("The KeylessAccount's ephemeral keypair has expired. Returning you to the homepage to log in.");
                window.location.href = "/";
            } else {
                setkeylessWalletAddress(keylessAccount.accountAddress.toString());
                // Step 2: Build and sponsor a transaction on yuour backend
                const sponsorshipResp = await axios.post('/buildAndSponsorTx', {
                    message,
                    sender: keylessAccount?.accountAddress.toString()
                });
                // Step 3: Obtain the sender signature over the transaction after deserializing it
                const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.simpleTx).toUint8Array()));
                const senderSig = aptosClient.sign({ signer: keylessAccount, transaction: simpleTx });

                // Step 4: Submit the transaction along with both signatures and return the response to the caller
                const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.sponsorAuthenticator).toUint8Array()));
                return await aptosClient.transaction.submit.simple({
                    transaction: simpleTx,
                    senderAuthenticator: senderSig,
                    feePayerAuthenticator: sponsorSig,
                });
            }
        } else {
            console.log("No pre-existing Keyless account found :(. Returning you to the homepage to log in.");
            window.location.href = "/";
        }
        return undefined;
    }


    const logout = async (): Promise<undefined> => {
        console.log("Deleting the KeylessAccount from local storage and retunging to the homepage.");
        deleteKeylessAccount();
        window.location.href = "/";
    }

    return (
        <>
            <div>
                <h1>Shinami Sponsored Transactions with Aptos Keyless</h1>
                <h3>Your Aptos Keyless wallet address</h3>
                <p>{keylessWalletAddress}</p>
                <h3>Set a short message to store on your account. Then click "Make a move call".</h3>
                <form onSubmit={executeTransaction}>
                    <div>
                        <label htmlFor="messageText">Message:</label>
                        <input type="text" name="messageText" id="messageText" required />
                    </div>
                    <button type="submit">Make move call</button>
                </form>
                <h3>Transaction result:</h3>
                {newSuccessfulResult ?
                    <label>Latest Succesful Digest: {latestDigest} Message Set To:  {latestResult} </label>
                    :
                    <label>Latest Successful Digest: N/A</label>
                }
                <GoogleLogout
                    type="dark"
                    label="Logout"
                    onClick={() => { logout() }}
                />
            </div>
        </>
    );
};

export default TransactionPage;
