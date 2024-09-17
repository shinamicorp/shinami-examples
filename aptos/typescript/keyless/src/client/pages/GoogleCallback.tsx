import { jwtDecode } from 'jwt-decode';
import { getLocalEphemeralKeyPair } from "../ephemeral";
import { Aptos, AptosConfig, Network, EphemeralKeyPair } from '@aptos-labs/ts-sdk';
import { storeKeylessAccount } from "../keyless";



const GoogleCallbackPage = () => {

    // Create a Keyless account and store it in local browser storage so 
    //  that when the user returns to the site it can be used again (as long
    //  as the ephmemeral keypair hasn't expired)
    const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
    const createKeylessAccount = async (jwt: string, ephemeralKeyPair: EphemeralKeyPair) => {
        const keylessAccount = await aptos.deriveKeylessAccount({
            jwt,
            ephemeralKeyPair,
        });
        storeKeylessAccount(keylessAccount);
    }

    // Upon reaching this page when Google responds,
    // obtain the JWT from the URL.
    const parseJWTFromURL = (url: string): string | null => {
        const urlObject = new URL(url);
        const fragment = urlObject.hash.substring(1);
        const params = new URLSearchParams(fragment);
        return params.get('id_token');
    };
    const jwt = parseJWTFromURL(window.location.href);

    // If we have a JWT and a valid ephemeral keypair - used on the home page ('/') 
    //  for obtaining the nonce used in the OpenID Connect login flow - then 
    //  create a KeylessAccount for the user and store it in local browser storage.
    // Finally, change to the transaction page as the user is now logged in.
    // If we can't obtain a JWT from the URL, send the user back to the home page
    //  to attempt to log in again.
    if (jwt) {
        const payload = jwtDecode<{ nonce: string }>(jwt);
        const jwtNonce = payload.nonce;
        console.log("jwt: ", jwt);

        const ekp = getLocalEphemeralKeyPair();

        // Validate the EphemeralKeyPair
        if (!ekp || ekp.nonce !== jwtNonce || ekp.isExpired()) {
            throw new Error("Ephemeral key pair not found or expired");
        }
        createKeylessAccount(jwt, ekp);
        window.location.href = "/transaction";
    } else {
        console.log("Could not obtain JWT from URL!");
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
