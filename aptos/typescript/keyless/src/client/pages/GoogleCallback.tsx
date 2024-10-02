import { jwtDecode } from 'jwt-decode';
import { getLocalEphemeralKeyPair } from "../ephemeral";
import { EphemeralKeyPair } from '@aptos-labs/ts-sdk';
import { storeKeylessAccount } from "../keyless";
import { createAptosClient } from "@shinami/clients/aptos";


// Get our environmental variable from our .env.local file
const VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY = import.meta.env.VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY;

if (!(VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY)) {
    throw Error('VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY .env.local variable not set');
}

const aptosClient = createAptosClient(VITE_SHINAMI_PUBLIC_APTOS_NODE_TESTNET_API_KEY);
const GoogleCallbackPage = () => {

    // Create a Keyless account and store it in local browser storage so 
    //  that when the user returns to the site it can be used again (as long
    //  as the ephmemeral keypair hasn't expired).
    const createKeylessAccountAndChangePage = async (jwt: string, ephemeralKeyPair: EphemeralKeyPair) => {
        const keylessAccount = await aptosClient.deriveKeylessAccount({
            jwt,
            ephemeralKeyPair,
        });
        console.log("Storing a KeylessAccount for the user.");
        storeKeylessAccount(keylessAccount);
        window.location.href = "/transaction";
    }
    // Upon reaching this page when Google responds, obtain the JWT from the URL.
    const parseJWTFromURL = (url: string): string | null => {
        console.log("Parsing the JWT from the URL");
        const urlObject = new URL(url);
        const fragment = urlObject.hash.substring(1);
        const params = new URLSearchParams(fragment);
        return params.get('id_token');
    };
    const jwt = parseJWTFromURL(window.location.href);

    // If we have a JWT and a valid ephemeral keypair - used on the home page ('/') 
    //  for obtaining the nonce used in the OpenID Connect login flow - then 
    //  create a KeylessAccount for the user and store it in local browser storage.
    // Finally, change to the '/transaction' page as the user now has a KeylessAccount
    //  to sign their transactions.
    // If we can't obtain a JWT from the URL, send the user back to the home page
    //  to attempt to log in again.
    if (jwt) {
        const payload = jwtDecode<{ nonce: string }>(jwt);
        const jwtNonce = payload.nonce;

        const ekp = getLocalEphemeralKeyPair();
        if (!ekp || ekp.nonce !== jwtNonce || ekp.isExpired()) {
            throw new Error("Ephemeral key pair not found or expired");
        }
        console.log("Creating a KeylessAccount");
        createKeylessAccountAndChangePage(jwt, ekp);
    } else {
        console.log("Could not obtain JWT from URL. Sending the user back to the homepage to try again.");
        window.location.href = "/";
    }

    return (
        <>
            <div>
                <h2>Generating a zkProof and creating your Keyless Account...</h2>
            </div>
        </>
    );
};

export default GoogleCallbackPage;
