import {
    getEmphemeralKeypair,
    getJWTRandomness,
    getMaxEpoch,
    storeZkWalletAddress,
    storeSalt,
    storeZkProof,
    storeZkAudValue,
    storeZkSubValue
} from "../common";
import axios from "axios";
import { PartialZkLoginSignature } from "../types";
import { jwtToAddress } from '@mysten/sui/zklogin';
import { getExtendedEphemeralPublicKey } from "@mysten/sui/zklogin";

// Get our environmental variable from our .env.local file
const VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY = import.meta.env.VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY;

if (!(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY)) {
    throw Error('VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY .env.local variable not set');
}

const GoogleCallbackPage = () => {


    // 1. Upon reaching this page when Google responds, obtain the JWT from the URL.
    const parseJWTFromURL = (url: string): string | null => {
        console.log("Parsing the JWT from the URL");
        const urlObject = new URL(url);
        const fragment = urlObject.hash.substring(1);
        const params = new URLSearchParams(fragment);
        return params.get('id_token');
    };
    console.log("Full URL: ", window.location.href);
    const jwt = parseJWTFromURL(window.location.href);
    if (!jwt) {
        throw new Error("unable to get JWT from URL!")
    } else {
        console.log("JWT: ", jwt);
    }

    const getSaltAndProof = async (jwt: string) => {

        // 2. check that all the needed data exists
        const emphemeralKeyPair = getEmphemeralKeypair();
        if (!emphemeralKeyPair) {
            throw new Error("emphemeralKeyPair not found in session storage!");
        } else {
            console.log("Found ephemeralKeyPair in session storage with public key: ", emphemeralKeyPair.getPublicKey().toBase64());
        }

        const jwtRandomness = getJWTRandomness();
        if (!jwtRandomness) {
            throw new Error("jwtRandomness not found in session storage!");
        } else {
            console.log("Found jwtRandomness in session storage: ", jwtRandomness);
        }

        const maxEpoch = getMaxEpoch();
        if (!maxEpoch) {
            throw new Error("maxEpoch not found in session storage!");
        } else {
            console.log("Found maxEpoch in session storage: ", maxEpoch);
        }

        // 3. Ask the BE to call Shinami to (create if needed) and get the salt associated with this
        //    (sub,aud,iss,subwallet?) identifier. 
        const walletInfo = await axios.post('/getWalletSalt', {
            jwt
        });

        const salt = walletInfo.data.salt;
        const walletAddress = walletInfo.data.walletAddress;
        const aud = walletInfo.data.aud;
        const sub = walletInfo.data.sub;
        const zkLoginUserAddress = jwtToAddress(jwt, salt);
        console.log("Address from jwtToAddress(jwt, salt); : ", zkLoginUserAddress);

        // 4. Store the aud, sub, and salt values as we'll need these for creating the zkLogin sender signature
        storeZkAudValue(aud);
        storeZkSubValue(sub);
        storeSalt(salt);
        storeZkWalletAddress(walletAddress);
        console.log("GoogleCallback page --salt: ", salt, " --walletAddress: ", walletAddress, " --aud: ", aud, " --sub: ", sub, " --emphemeralKeyPair.getPublicKey().toBase64(): ", emphemeralKeyPair.getPublicKey().toBase64())
        // 5. Ask the BE to call Shinami to generate a zkProof for this ephemeralKeypair session
        const pKey = getExtendedEphemeralPublicKey(emphemeralKeyPair.getPublicKey());
        console.log("Mysten generated extended ephemeralKeypair: ", pKey);

        const zkProof = await axios.post('/getZkProof', {
            jwt: jwt,
            maxEpoch: maxEpoch,
            publicKey: emphemeralKeyPair.getPublicKey().toBase64(),
            jwtRandomness: jwtRandomness,
            salt: salt
        });

        console.log("zkProof: ", zkProof.data.zkProof);
        // 6. Store the proof. We'll fetch it later as a part of building the zkLogin tx signature
        storeZkProof(zkProof.data.zkProof as PartialZkLoginSignature);

        console.log("going to the TransactionPage...");
        window.location.href = `/transaction#${walletAddress}`;
    }

    getSaltAndProof(jwt);

    return (
        <>
            <div>
                <h2>Creating or fetching your zkLogin wallet and generating a zkProof for transaction signing...</h2>
            </div>
        </>
    );
};

export default GoogleCallbackPage;