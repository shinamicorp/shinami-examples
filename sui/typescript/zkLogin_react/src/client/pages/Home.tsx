import "../App.css";
// import GoogleButton from 'react-google-button';
import { generateNonce, generateRandomness } from '@mysten/sui/zklogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createSuiClient } from "@shinami/clients/sui";
import {
    storeJWTRandomness,
    storeMaxEpoch,
    storeEmphemeralKeypair,
    storePasskeyKeypair,
    storePasskeyWalletAddress,
    getPasskeyKeypair
} from "../common";
import {
    BrowserPasskeyProvider,
    BrowserPasswordProviderOptions,
    PasskeyKeypair
} from '@mysten/sui/keypairs/passkey';

// Get our environmental variable from our .env.local file
const VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY = import.meta.env.VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY;

if (!(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY)) {
    throw Error('VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY .env.local variable not set');
}

const createNonce = async (epochsValidFor: number = 1): Promise<string> => {
    const suiClient = createSuiClient(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY);
    const { epoch, epochDurationMs, epochStartTimestampMs } = await suiClient.getLatestSuiSystemState();

    const maxEpoch = Number(epoch) + epochsValidFor; // this means the ephemeral key will be active for 2 epochs from now.
    const ephemeralKeyPair = new Ed25519Keypair();
    const randomness = generateRandomness();

    // we store these as they'll be needed for obtaining the proof later
    storeJWTRandomness(randomness);
    storeMaxEpoch(maxEpoch);
    storeEmphemeralKeypair(ephemeralKeyPair);
    console.log("Home page emphemeralKeyPair.getPublicKey().toBase64(): ", ephemeralKeyPair.getPublicKey().toBase64());
    console.log("Home page randomness: ", randomness);
    console.log("Home page max epoch: ", maxEpoch);

    return generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);
}

// 1. 
// 2. Redirect the user to Google's OAuth login flow. The user will then be redirected back
//     to the '/googlecallback' page where we'll parse the JWT and...
const logInWithGoogle = async () => {
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!(GOOGLE_CLIENT_ID)) {
        throw Error('GOOGLE_CLIENT_ID .env.local variable not set');
    }
    const NONCE = await createNonce();
    const REDIRECT_URI = 'http://localhost:3000/googlecallback';
    const LOGIN_URL = `https://accounts.google.com/o/oauth2/v2/auth?response_type=id_token&scope=openid&nonce=${NONCE}&redirect_uri=${REDIRECT_URI}&client_id=${GOOGLE_CLIENT_ID}`;
    window.location.href = LOGIN_URL;
}

const fetchOrCreatePasskey = async () => {

    let keypair = getPasskeyKeypair();
    if (!keypair) {
        console.log("no passkey keypair found");
        keypair = await PasskeyKeypair.getPasskeyInstance(
            new BrowserPasskeyProvider('Sui Passkey Example', {
                rpName: 'Sui Passkey Example',
                rpId: window.location.hostname,
            } as BrowserPasswordProviderOptions),
        );
        if (!keypair) {
            throw new Error("Unable to generate keypair");
        } else {
            console.log("Storing Passkey keypair: ", keypair);
            storePasskeyKeypair(keypair);
            const walletAddress = keypair.getPublicKey().toSuiAddress();
            storePasskeyWalletAddress(walletAddress);
            console.log("Passkey wallet address: ", walletAddress);
            window.location.href = `/transaction#${walletAddress}`;
        }
    } else {
        console.log("found an existing passkey keypair", keypair);
        const walletAddress = keypair.getPublicKey().toSuiAddress();
        storePasskeyWalletAddress(walletAddress);
        console.log("passkey wallet address: ", walletAddress);
        window.location.href = `/transaction#${walletAddress}`;
    }
}

const HomePage = () => {

    return (
        <>
            <div>
                <h2>Shinami Sponsored Transactions with single-app Sui zkLogin and passkey wallets</h2>
                <br />
                <button onClick={() => fetchOrCreatePasskey()}>Use a passkey wallet with your phone</button>
                <br />
                <br />
                <br />
                <button onClick={() => logInWithGoogle()}>Use a zkLogin wallet with your Google login</button>
            </div>
        </>
    );
};

export default HomePage;