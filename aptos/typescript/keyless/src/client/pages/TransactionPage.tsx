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
    Hex,
    KeylessAccount,
    AccountAddress,
    MoveString
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

    const EVENT_TYPE = "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::MessageChange";
    const keylessAccount = getLocalKeylessAccount();


    // 1. Get the user's input and update the page state.
    // 2. Build, sponsor, and execute a feePayer SimpleTransaction with the given user input. 
    // 3. Poll a Full node for the digest and update the page with key info.
    const executeTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setnewSuccessfulResult(false);
        const form = e.currentTarget
        const formElements = form.elements as typeof form.elements & {
            messageText: { value: string }
        };

        const message = formElements.messageText.value;
        let pendingTxResponse = undefined;

        if (keylessAccount) {
            setkeylessWalletAddress(keylessAccount.accountAddress.toString());
            try {
                pendingTxResponse = await
                    //keylessTxBEBuildFESubmit(message, keylessAccount);
                    keylessTxFEBuildBESubmit(message, keylessAccount);

                if (pendingTxResponse?.hash) {
                    waitForTxAndUpdateResult(pendingTxResponse.hash);
                } else {
                    console.log("Unable to find a tx digest to search for.");
                }
            } catch (e) {
                console.log("error: ", e);
            }
        } else {
            console.log("No pre-existing Keyless account found :(. Returning you to the homepage to log in.");
            window.location.href = "/";
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
                if (executedTransaction.events[element].type == EVENT_TYPE) {
                    setLatestResult(executedTransaction.events[element].data.to_message);
                }
            }
            setLatestDigest(txHash);
            setnewSuccessfulResult(true);
        } else {
            console.log("Transaction did not execute successfully.");
        }
    }

    const keylessTxFEBuildBESubmit = async (message: string, keylessAccount: KeylessAccount): Promise<PendingTransactionResponse> => {
        // Step 1. Build a feePayer tx with the user's input
        const simpleTx = await buildSimpleMoveCallTransaction(keylessAccount.accountAddress, message);

        // Step 2. Sign the transaction with the user's KeylessAccount
        const senderSig = aptosClient.sign({ signer: keylessAccount, transaction: simpleTx });

        // Step 3. Ask the BE to sponsor and submit the transaction
        const pendingTx = await axios.post('/sponsorAndSubmitTx', {
            transaction: simpleTx.bcsToHex().toString(),
            senderAuth: senderSig.bcsToHex().toString()
        });

        return pendingTx.data.pendingTx;
    }


    // 1. Ask the BE to build and sponsor a feePayer SimpleTransaction
    // 2. Sign the transaction with the user's Keyless wallet
    // 3. Submit the transaction
    const keylessTxBEBuildFESubmit = async (message: string, keylessAccount: KeylessAccount): Promise<PendingTransactionResponse> => {
        console.log("keylessTxBEBuildFESubmit");

        // Step 1: Ask the BE to build and sponsor a transaction with the user's input and address
        const sponsorshipResp = await axios.post('/buildAndSponsorTx', {
            message,
            sender: keylessAccount?.accountAddress.toString()
        });

        // Step 2: Obtain the sender signature over the transaction after deserializing it
        const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.simpleTx).toUint8Array()));
        const senderSig = aptosClient.sign({ signer: keylessAccount, transaction: simpleTx });

        // Step 3: Submit the transaction along with both signatures and return the response to the caller
        const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.sponsorAuthenticator).toUint8Array()));
        return await aptosClient.transaction.submit.simple({
            transaction: simpleTx,
            senderAuthenticator: senderSig,
            feePayerAuthenticator: sponsorSig,
        });
    }

    // Build a SimpleTransaction representing a Move call to a module we deployed to Testnet
    // https://explorer.aptoslabs.com/account/0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817/modules/code/message?network=testnet
    async function buildSimpleMoveCallTransaction(sender: AccountAddress, message: string): Promise<SimpleTransaction> {
        return await aptosClient.transaction.build.simple({
            sender: sender,
            withFeePayer: true,
            data: {
                function: "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::set_message",
                functionArguments: [new MoveString(message)]
            }
        });
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
