import "../App.css";
import { useState } from "react"
import axios from 'axios';
import GoogleLogout from 'react-google-button';
import { Box, Heading } from "@radix-ui/themes";
import { createSuiClient } from "@shinami/clients/sui";
import {
    PasskeyKeypair
} from '@mysten/sui/keypairs/passkey';
import {
    getEmphemeralKeypair,
    getZkWalletAddress,
    getSalt,
    getPasskeyWalletAddress,
    getZkProof,
    getMaxEpoch,
    getZkAudValue,
    getZkSubValue,
    clearZkLoginSessionData
} from "../common";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { fromBase64 } from "@mysten/sui/utils";
import { genAddressSeed, getZkLoginSignature } from '@mysten/sui/zklogin';
import { ZkLoginProof } from "../types";
import { Transaction } from "@mysten/sui/transactions";


// Get our environmental variable from our .env.local file
const VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY = import.meta.env.VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY;

if (!(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY)) {
    throw Error('VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY .env.local variable not set');
}

const nodeClient = createSuiClient(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY);

type AddCallEvent = {
    result: string;
};

const parseAddressFromURL = (url: string): string => {
    console.log("Parsing the wallet address from the URL");
    const urlObject = new URL(url);
    const fragment = urlObject.hash.split("#");
    if (fragment.length == 2) {
        return fragment[1];
    } else {
        return "Address will be shown after transaction."
    }
};

enum WalletType {
    ZkLogin = "zkLogin",
    Passkey = "Passkey"
}

const TransactionPage = () => {
    const URL_WALLET_ADDRESS = parseAddressFromURL(window.location.href);
    const [latestDigest, setLatestDigest] = useState<string>();
    const [latestResult, setLatestResult] = useState<string>();
    const [firstInt, setFirstInt] = useState<string>();
    const [secondInt, setsecondInt] = useState<string>();
    const [newSuccessfulResult, setnewSuccessfulResult] = useState<boolean>();
    const [walletType, setWalletType] = useState<WalletType>(WalletType.ZkLogin);
    const [walletAddress, setWalletAddress] = useState<string>(URL_WALLET_ADDRESS);

    const executeTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setnewSuccessfulResult(false);
        const form = e.currentTarget
        const formElements = form.elements as typeof form.elements & {
            integerOne: { value: number },
            integerTwo: { value: number }
        };

        const x = formElements.integerOne.value;
        const y = formElements.integerTwo.value;
        setFirstInt(x.toString());
        setsecondInt(y.toString());

        let suiTxResponse = undefined;
        try {
            suiTxResponse = await moveCallBEBuildBESubmit(x, y);

            if (!suiTxResponse || !suiTxResponse.digest) {
                console.log("Unable to find a digest returned from the backend.");
            } else {
                waitForTxAndUpdateResult(suiTxResponse.digest);
            }
        } catch (e) {
            console.log(e);
        }
    }

    // Poll the Full node represented by the SuiClient until the given digest
    // has been checkpointed and propagated to the node, and the node returns 
    // results for the digest. On the response, update the page accordingly.
    const waitForTxAndUpdateResult = async (digest: string) => {
        const finalResult = await nodeClient.waitForTransaction({
            digest: digest,
            options: {
                showEffects: true,
                showEvents: true
            }
        });

        if (finalResult.effects && finalResult.events && finalResult.effects.status.status == "success") {
            const resultObj = finalResult.events[0].parsedJson as AddCallEvent;
            const result = resultObj.result;
            setLatestDigest(digest);
            setLatestResult(result);
            setnewSuccessfulResult(true);
        } else {
            console.log("Transaction did not execute successfully.");
        }
    }

    const getSenderAddress = async (): Promise<string | null> => {
        if (walletType == WalletType.ZkLogin) {
            const sender = getZkWalletAddress()
            console.log("Sender address (zkLogin wallet): ", sender);
            return sender;
        } else if (walletType == WalletType.Passkey) {
            const sender = getPasskeyWalletAddress()
            console.log("Sender address (Passkey wallet): ", sender);
            return sender;
        } else {
            throw new Error("Uknown wallet type: ", walletType);
        }
    }

    // For these steps, see: https://docs.sui.io/guides/developer/cryptography/zklogin-integration#assemble-the-zklogin-signature-and-submit-the-transaction
    const getSenderSignature = async (txString: string): Promise<string | null> => {
        if (walletType == WalletType.ZkLogin) {
            console.log("Getting zkLogin wallet signature...");
            const ephemeralKeypair = getEmphemeralKeypair();
            if (ephemeralKeypair) {
                // 1. First, sign the tx with the ephemeral keypair
                const signature = await Transaction.from(txString).sign(
                    { signer: ephemeralKeypair }
                );

                // 2. Next, generate an address seed
                const salt = getSalt();
                if (!salt) {
                    throw new Error("Tranasction Page: no salt!");
                }
                const aud = getZkAudValue();
                if (!aud) {
                    throw new Error("Transaction page: no aud value!");
                }
                const sub = getZkSubValue();
                if (!sub) {
                    throw new Error("Transaction page: no sub value!");
                }
                const addSeed = genAddressSeed(
                    BigInt(salt),
                    'sub',
                    sub,
                    aud,
                ).toString();

                // 3. Finally, generate the zkLogin signature
                // 3a. Get the zkProof
                const zkProof = getZkProof();
                if (!zkProof) {
                    throw new Error("Transaction Page: no zkProof!");
                }
                // console.log("zkProof right before getting zkSignature: ", zkProof);
                const maxEpoch = getMaxEpoch();
                if (!maxEpoch) {
                    throw new Error("Transaction page: no max Epoch!");
                }
                // 3b. combine the proof and addressSeed and generate the zkSignature
                const fullProofData: ZkLoginProof = { ...zkProof, addressSeed: addSeed };
                return getZkLoginSignature({
                    inputs: fullProofData,
                    maxEpoch,
                    userSignature: signature.signature,
                });
            }
            return null;
        } else if (walletType == WalletType.Passkey) {
            console.log("Getting passkey wallet signature...");
            return null;
        } else {
            throw new Error("Uknown wallet type: ", walletType);
        }
    }

    // 1. Ask the backend to build and sponsor a Move call transction with the given user input.
    // 2. Sign the sponsored transaction returned from the backend with the user's  wallet.
    // 3. Ask the backend to execute the signed transaction.
    // 4. Return the SuiTransactionBlockResponse to the caller.
    const moveCallBEBuildBESubmit = async (x: number, y: number): Promise<SuiTransactionBlockResponse | undefined> => {
        console.log("connectedWalletTxBEBuildBESubmit");
        const senderAddress = await getSenderAddress();
        console.log(walletType, " sender address: ", senderAddress);
        const sponsorshipResp = await axios.post('/buildSponsoredtx', {
            x: x,
            y: y,
            sender: senderAddress
        });

        const signature = await getSenderSignature(sponsorshipResp.data.txBytes);
        if (!signature) {
            throw new Error("Unable to generate signature!");
        } else {
            console.log("Obtained sender signature: ", signature);
        }

        const resp = await axios.post('/executeSponsoredTx', {
            txBytes: sponsorshipResp.data.txBytes,
            sponsorSig: sponsorshipResp.data.sponsorSig,
            senderSig: signature
        });
        return resp.data;
    }

    // Toggle between using zkLogin and Passkey wallet as the sender.
    //  Update the sender address to the new sender.
    const changeWalletType = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (walletType == WalletType.ZkLogin) {
            setWalletType(WalletType.Passkey);
            const address = getPasskeyWalletAddress();
            if (!address) {
                console.log("No known passkey wallet address. Sending user back to homepage to create a passkey wallet...");
                window.location.href = "/";
            } else {
                setWalletAddress(address);
            }
        } else {
            setWalletType(WalletType.ZkLogin);
            const address = getZkWalletAddress();
            if (!address) {
                console.log("No known zkLogin wallet address. Sending user back to homepage to create a zkLogin wallet...");
                window.location.href = "/";
            } else {
                setWalletAddress(address);
            }
        }
    }

    // Delete the user's zkLogin session data and return them to the homepage
    const logout = async (): Promise<undefined> => {
        console.log("Removing zkLogin data from session storage and returning the user to the homepage.");
        clearZkLoginSessionData();
        window.location.href = "/";
    }

    return (
        <>
            <Box>
                <Heading>Shinami Gas Station sponsored transaction</Heading>
            </Box>
            <Box>
                <h2>Using your {walletType} wallet</h2>
                <p>Wallet address: {walletAddress}</p>
                <form onSubmit={changeWalletType}>
                    <button type="submit">Click to switch wallet type (will return to homepage if you don't have the other wallet type)</button>
                </form>
                <br></br>
                <h2>Pick two positive integers to add together via a Move call</h2>
                <form onSubmit={executeTransaction}>
                    <div>
                        <label htmlFor="integerOne">First positive integer:</label>
                        <input type="number" name="integerOne" id="integerOne" required />
                    </div>
                    <div>
                        <label htmlFor="integerTwo">Second positive integer:</label>
                        <input type="number" name="integerTwo" id="integerTwo" required />
                    </div>
                    <button type="submit">Make move call</button>
                </form>
                <h3>Transaction result:</h3>
                {newSuccessfulResult ?
                    <label>Latest Succesful Digest: {latestDigest} Message Set To:  {latestResult} </label>
                    :
                    <label>Latest Successful Digest: N/A</label>
                }
                {walletType == WalletType.ZkLogin ? <GoogleLogout
                    type="dark"
                    label="Logout"
                    onClick={() => { logout() }}
                /> : ""}
            </Box>
        </>
    );
};

export default TransactionPage;