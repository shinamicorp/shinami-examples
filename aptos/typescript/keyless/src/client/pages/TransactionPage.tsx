import "../App.css";
import { useState } from "react"
import axios from 'axios';
import {
    AccountAddress,
    AccountAuthenticator,
    Deserializer,
    Hex,
    KeylessAccount,
    MoveString,
    PendingTransactionResponse,
    SimpleTransaction,
    UserTransactionResponse
} from "@aptos-labs/ts-sdk";
import { getLocalKeylessAccount, deleteKeylessAccount } from "../keyless";
import { deleteEphemeralKeyPair } from "../ephemeral";
import GoogleLogout from 'react-google-button';
import { createAptosClient } from "@shinami/clients/aptos";

// Get our environmental variable from our .env.local file
const VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY = import.meta.env.VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY;

if (!(VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY)) {
    throw Error('VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY .env.local variable not set');
}

const TransactionPage = () => {

    const [latestDigest, setLatestDigest] = useState<string>();
    const [latestResult, setLatestResult] = useState<string>();
    const [newSuccessfulResult, setnewSuccessfulResult] = useState<boolean>();
    const [keylessWalletAddress, setkeylessWalletAddress] = useState<string>();

    const EVENT_TYPE = "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::MessageChange";
    const keylessAccount = getLocalKeylessAccount();

    // Create an Aptos client for building, submitting, and fetching transactions.
    const aptosClient = createAptosClient(VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY);


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
            if (!keylessAccount.ephemeralKeyPair.isExpired()) {
                setkeylessWalletAddress(keylessAccount.accountAddress.toString());
                try {
                    pendingTxResponse =
                        //    await keylessTxBEBuildFESubmit(message, keylessAccount);
                        await keylessTxFEBuildBESubmit(message, keylessAccount);

                    if (pendingTxResponse?.hash) {
                        waitForTxAndUpdateResult(pendingTxResponse.hash);
                    } else {
                        console.log("Unable to find a tx digest to search for.");
                    }
                } catch (e) {
                    console.log("error: ", e);
                }
            } else {
                console.log("But the ephmeral keypair has expired. Returning user to the homepage to log in.");
                window.location.href = "/";
            }
        } else {
            console.log("No pre-existing Keyless account found. Returning user to the homepage to log in.");
            window.location.href = "/";
        }
    }


    // 1. Poll the Full node represented by the Aptos client until the given digest
    //     has been propagated to the node, and the node returns results for the digest.
    // 2. Upon the response, update the page accordingly.
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


    // 1. Build a feePayer SimpleTransaction
    // 2. Sign the transaction with the user's Keyless wallet
    // 3. Ask the backend to sponsor and submit the transaction
    const keylessTxFEBuildBESubmit = async (message: string, keylessAccount: KeylessAccount): Promise<PendingTransactionResponse> => {
        console.log("keylessTxFEBuildBESubmit");
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


    // Delete the user's KeylessAccount and ephemeral keypair and return them to the homepage
    const logout = async (): Promise<undefined> => {
        console.log("Deleting the KeylessAccount and ephemeral keypair from local storage and returning the user to the homepage.");
        deleteKeylessAccount();
        deleteEphemeralKeyPair();
        window.location.href = "/";
    }


    return (
        <>
            <div>
                <h1>Shinami Sponsored Transactions with Aptos Keyless</h1>
                <h3>Your Aptos Keyless wallet address:</h3>
                <p>{keylessWalletAddress}</p>
                <h3>Set a short message to store on your account. Then click "Make a move call".</h3>
                <form onSubmit={executeTransaction}>
                    <div>
                        <label htmlFor="messageText">Message:</label>
                        <input type="text" name="messageText" id="messageText" required />
                    </div>
                    <button type="submit">Make move call</button>
                </form>
                <h3>Latest Succesful Digest:</h3>
                {newSuccessfulResult ?
                    <p>{latestDigest} -- String recorded:  "{latestResult}" </p>
                    :
                    <p>N/A</p>
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
