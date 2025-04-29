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
    getPasskeyWalletAddress,
    clearPasskeyData,
    PASSKEY_RP_NAME,
    PASSKEY_RP_ID
} from "../common";
import {
    BrowserPasskeyProvider,
    BrowserPasswordProviderOptions,
    PasskeyKeypair,
    findCommonPublicKey
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

const recoverExistingKeypair = async (): Promise<PasskeyKeypair | undefined> => {
    let provider = new BrowserPasskeyProvider('Sui Passkey Example', {
        rpName: PASSKEY_RP_NAME,
        rpId: PASSKEY_RP_ID,
    } as BrowserPasswordProviderOptions);

    const testMessage = new TextEncoder().encode('Hello world!');
    const possiblePks = await PasskeyKeypair.signAndRecover(provider, testMessage);

    const testMessage2 = new TextEncoder().encode('Hello world 2!');
    const possiblePks2 = await PasskeyKeypair.signAndRecover(provider, testMessage2);

    const commonPk = findCommonPublicKey(possiblePks, possiblePks2);
    return new PasskeyKeypair(commonPk.toRawBytes(), provider);
}

const moveToTransactionPageWithKeyPair = (keypair: PasskeyKeypair, saveKeyPair: boolean = true) => {
    const keypair_public_key = keypair.getPublicKey().toRawBytes()
    console.log("Storing Passkey public key bytes: ", keypair_public_key);
    storePasskeyKeypairPublicKey(keypair_public_key);
    const walletAddress = keypair.getPublicKey().toSuiAddress();
    storePasskeyWalletAddress(walletAddress);
    console.log("Passkey wallet address: ", walletAddress);
    window.location.href = `/transaction#${walletAddress}`;
}

const fetchOrCreatePasskey = async () => {
    clearPasskeyData();

    // 1. First, try to fetch an existing public key from local storage
    let keypair_public_key = getPasskeyKeypairPublicKey();
    let passkeyKeypair = undefined;

    // 2. If not found, try to recover one. For now, this is an annyoing process for first time users.
    if (!keypair_public_key) {
        console.log("No passkey keypair public key found. Attempting to restore an existing passkey.");
        passkeyKeypair = await recoverExistingKeypair();
        if (passkeyKeypair) {
            console.log("storing recovered keypair and moving to tx page...");
            moveToTransactionPageWithKeyPair(passkeyKeypair);
        } else {
            // 3. If we still don't have a public key, it means we could not 
            //     recover one. So, we'll try to generate a new one.
            console.log("no passkey keypair found or recovered");
            passkeyKeypair = await PasskeyKeypair.getPasskeyInstance(
                new BrowserPasskeyProvider('Shinami Sponsored tx passkey', {
                    rpName: PASSKEY_RP_NAME,
                    rpId: PASSKEY_RP_ID,
                } as BrowserPasswordProviderOptions),
            );
            if (!passkeyKeypair) {
                throw new Error("Unable to generate keypair");
            } else {
                console.log("storing newly generated keypair and moving to tx page...");
                moveToTransactionPageWithKeyPair(passkeyKeypair);
            }
        }
    } else {
        console.log("found an existing passkey keypair");
        const publicKeyBytes = getPasskeyKeypairPublicKey();
        console.log("Get back Passkey public key bytes: ", publicKeyBytes);
        if (publicKeyBytes != null) {
            let passkeyKeypair = new PasskeyKeypair(publicKeyBytes, new BrowserPasskeyProvider('Sui Passkey Example', {
                rpName: PASSKEY_RP_NAME,
                rpId: PASSKEY_RP_ID,
            } as BrowserPasswordProviderOptions));
            moveToTransactionPageWithKeyPair(passkeyKeypair, false);
        }
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