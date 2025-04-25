import "../App.css";
// import GoogleButton from 'react-google-button';
import { generateNonce, generateRandomness } from '@mysten/sui/zklogin';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { createSuiClient } from "@shinami/clients/sui";
import {
    storeJWTRandomness,
    storeMaxEpoch,
    getMaxEpoch,
    storeEmphemeralKeypair,
    clearZkLoginSessionData,
    getZkWalletAddress,
    storePasskeyKeypairPublicKey,
    storePasskeyWalletAddress,
    getPasskeyKeypairPublicKey,
    PASSKEY_RP_NAME,
    PASSKEY_RP_ID
} from "../common";
import {
    BrowserPasskeyProvider,
    BrowserPasswordProviderOptions,
    PasskeyKeypair,
} from '@mysten/sui/keypairs/passkey';


// Get our environmental variable from our .env.local file
const VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY = import.meta.env.VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY;

if (!(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY)) {
    throw Error('VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY .env.local variable not set');
}
const suiClient = createSuiClient(VITE_SHINAMI_PUBLIC_NODE_TESTNET_API_KEY);

// Create a nonce for the JWT request.
//  We'll save the randomness, maxEpoch, and ephemeral Keypair because we need those later for
//   zkProof generation and transaction signing. For more on nonce generation, including OAuth URLs for
//   providers other than Google, see: https://docs.sui.io/guides/developer/cryptography/zklogin-integration#get-jwt
const createNonce = async (currentEpoch: number, epochsValidFor: number = 1): Promise<string> => {
    const maxEpoch = Number(currentEpoch) + epochsValidFor; // this means the ephemeral key will be active for 2 epochs from now.
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

// Redirect the user to Google's OAuth login flow. The user will then be redirected back
//     to the '/googlecallback' page where we'll parse the JWT and ask for a zkProof.
const usezkLogin = async () => {
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!(GOOGLE_CLIENT_ID)) {
        throw Error('GOOGLE_CLIENT_ID .env.local variable not set');
    }

    const maxEpoch = getMaxEpoch();
    const { epoch, epochDurationMs, epochStartTimestampMs } = await suiClient.getLatestSuiSystemState();
    if (!maxEpoch || (Number(epoch) >= Number(maxEpoch))) {
        console.log("Missing or expired max epoch value. Deleting any zkLogin session data and generating and loggin the user in with Google...");
        clearZkLoginSessionData();
        const NONCE = await createNonce(Number(epoch));
        const REDIRECT_URI = 'http://localhost:3000/googlecallback';
        const GOOGLE_OAUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?response_type=id_token&scope=openid&nonce=${NONCE}&redirect_uri=${REDIRECT_URI}&client_id=${GOOGLE_CLIENT_ID}`;
        window.location.href = GOOGLE_OAUTH_URL;
    } else {
        console.log("Found a valid maxEpcoh: ", maxEpoch, " so taking the user to the transaction page...");
        const walletAddress = getZkWalletAddress();
        window.location.href = `/transaction#${walletAddress}`;
    }
}

const fetchOrCreatePasskey = async () => {

    let keypair_public_key = getPasskeyKeypairPublicKey();
    if (!keypair_public_key) {
        console.log("no passkey keypair found");
        const keypair = await PasskeyKeypair.getPasskeyInstance(
            new BrowserPasskeyProvider('Sui Passkey Example', {
                rpName: PASSKEY_RP_NAME,
                rpId: PASSKEY_RP_ID,
            } as BrowserPasswordProviderOptions),
        );
        if (!keypair) {
            throw new Error("Unable to generate keypair");
        } else {
            console.log("Storing Passkey keypair: ", keypair);
            storePasskeyKeypairPublicKey(keypair.getPublicKey().toBase64());
            const walletAddress = keypair.getPublicKey().toSuiAddress();
            storePasskeyWalletAddress(walletAddress);
            console.log("Passkey wallet address: ", walletAddress);
            window.location.href = `/transaction#${walletAddress}`;
        }
    } else {
        console.log("found an existing passkey keypair");

        // const walletAddress = keypair.getPublicKey().toSuiAddress();
        // storePasskeyWalletAddress(walletAddress);
        // console.log("passkey wallet address: ", walletAddress);
        // window.location.href = `/transaction#${walletAddress}`;
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
                <button onClick={() => usezkLogin()}>Use a zkLogin wallet with your Google login</button>
            </div>
        </>
    );
};

export default HomePage;