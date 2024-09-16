import { jwtDecode } from 'jwt-decode';
import { getLocalEphemeralKeyPair } from "../ephemeral";
import { Aptos, AptosConfig, Network, EphemeralKeyPair } from '@aptos-labs/ts-sdk';
import { storeKeylessAccount } from "../keyless";



const GoogleCallbackPage = () => {

    const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));

    const createKeylessAccount = async (jwt: string, ephemeralKeyPair: EphemeralKeyPair) => {
        const keylessAccount = await aptos.deriveKeylessAccount({
            jwt,
            ephemeralKeyPair,
        });
        storeKeylessAccount(keylessAccount);
        window.location.href = "/transaction";
    }


    const parseJWTFromURL = (url: string): string | null => {
        const urlObject = new URL(url);
        const fragment = urlObject.hash.substring(1);
        const params = new URLSearchParams(fragment);
        return params.get('id_token');
    };

    const jwt = parseJWTFromURL(window.location.href);

    if (jwt) {
        const payload = jwtDecode<{ nonce: string }>(jwt);
        const jwtNonce = payload.nonce;
        console.log("jwt: ", jwt);

        const ekp = getLocalEphemeralKeyPair();

        // Validate the EphemeralKeyPair
        if (!ekp || ekp.nonce !== jwtNonce || ekp.isExpired()) {
            throw new Error("Ephemeral key pair not found or expired");
        }
        createKeylessAccount(jwt, ekp)

    } else {
        console.log("Could not obtain JWT from URL!");
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
