import "../App.css";
import { EphemeralKeyPair } from '@aptos-labs/ts-sdk';
import { storeEphemeralKeyPair } from "../ephemeral";


const ephemeralKeyPair = EphemeralKeyPair.generate();
storeEphemeralKeyPair(ephemeralKeyPair);

const REDIRECT_URI = 'http://localhost:3000';
const GOOGLE_CLIENT_ID = '642095664298-a0fpnt3d6aokdsm7t33spn6bgcbbeks3.apps.googleusercontent.com';
const NONCE = ephemeralKeyPair.nonce
const loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=id_token&scope=openid+email+profile&nonce=${NONCE}&redirect_uri=${REDIRECT_URI}&client_id=${GOOGLE_CLIENT_ID}`

const HomePage = () => {
    return (
        <>
            <div>
                <h2>Shinami Sponsored Transactions with Aptos Keyless</h2>
                <br />
                <br />
            </div>
        </>
    );
};

export default HomePage;
