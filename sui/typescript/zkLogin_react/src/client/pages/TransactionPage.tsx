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
    getZkSubValue
} from "../common";
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";
import { genAddressSeed, getZkLoginSignature } from '@mysten/sui/zklogin';



// Get our environmental variable from our .env.local file
const VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY = import.meta.env.VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY;

if (!(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY)) {
    throw Error('VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY .env.local variable not set');
}

const nodeClient = createSuiClient(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY);

type AddCallEvent = {
    result: string;
};

type ZkLoginProof = Parameters<typeof getZkLoginSignature>["0"]["inputs"];

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
    const [latestDigest, setLatestDigest] = useState<string>();
    const [latestResult, setLatestResult] = useState<string>();
    const [firstInt, setFirstInt] = useState<string>();
    const [secondInt, setsecondInt] = useState<string>();
    const [newSuccessfulResult, setnewSuccessfulResult] = useState<boolean>();
    const [walletType, setWalletType] = useState<WalletType>(WalletType.ZkLogin);

    const URL_WALLET_ADDRESS = parseAddressFromURL(window.location.href);

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

    const getSenderSignature = async (txString: string): Promise<string | null> => {
        if (walletType == WalletType.ZkLogin) {
            console.log("Getting zkLogin wallet signature...");
            const ephemeralKeypair = getEmphemeralKeypair();
            if (ephemeralKeypair) {
                // First, sign the tx with the ephemeral keypair
                const { signature } = await ephemeralKeypair.signTransaction(fromBase64(txString));

                // Next, generate an address seed
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

                // Finally, generate the zkLogin signature
                const zkProof = getZkProof();
                if (!zkProof) {
                    throw new Error("Transaction Page: no zkProof!");
                }
                // console.log("zkProof right before getting zkSignature: ", zkProof);
                const maxEpoch = getMaxEpoch();
                if (!maxEpoch) {
                    throw new Error("Transaction page: no max Epoch!");
                }
                const fullProofData = { ...zkProof, addressSeed: addSeed };
                // console.log("fullProofData: ", fullProofData);
                return getZkLoginSignature({
                    inputs: fullProofData as ZkLoginProof,
                    maxEpoch,
                    userSignature: signature,
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

    const changeWalletType = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (walletType == WalletType.ZkLogin) {
            setWalletType(WalletType.Passkey);
        } else {
            setWalletType(WalletType.ZkLogin);
        }
    }

    return (
        <>
            <Box>
                <Heading>Shinami Gas Station sponsored transaction</Heading>
            </Box>
            <Box>
                <h2>Pick two positive integers to add together in a Move call</h2>
                <h3>Using your {walletType} wallet</h3>
                <form onSubmit={changeWalletType}>
                    <button type="submit">Switch wallet type</button>
                </form>
                <form onSubmit={executeTransaction}>
                    <div>
                        <label htmlFor="integerOne">First integer:</label>
                        <input type="number" name="integerOne" id="integerOne" required />
                    </div>
                    <div>
                        <label htmlFor="integerTwo">Second integer:</label>
                        <input type="number" name="integerTwo" id="integerTwo" required />
                    </div>
                    <button type="submit">Make move call</button>
                </form>
            </Box>
        </>
    );
};

export default TransactionPage;