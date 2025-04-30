import express from "express";
import ViteExpress from "vite-express";
import {
    GasStationClient,
    createSuiClient,
    buildGaslessTransaction,
    GaslessTransaction,
    ZkWalletClient,
    ZkProverClient
} from "@shinami/clients/sui";
import { Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519';


import dotenvFlow from 'dotenv-flow';

// Get our environmental variables from our .env.local file
dotenvFlow.config();
const ALL_SERVICES_TESTNET_ACCESS_KEY = process.env.ALL_SERVICES_TESTNET_ACCESS_KEY;
const EXAMPLE_MOVE_PACKAGE_ID = process.env.EXAMPLE_MOVE_PACKAGE_ID;

if (!(ALL_SERVICES_TESTNET_ACCESS_KEY && EXAMPLE_MOVE_PACKAGE_ID)) {
    throw Error('ALL_SERVICES_TESTNET_ACCESS_KEY and/or EXAMPLE_MOVE_PACKAGE_ID .env.local variables not set');
}

// Create Shinami clients for sponsoring and executing transactions and for our Invisible Wallet operations.
const nodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const gasClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new ZkWalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const proverClient = new ZkProverClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// Initilaize our server
const app = express();
app.use(express.json());

ViteExpress.listen(app, 3000, () =>
    console.log("Server is listening on port 3000..."),
);


// Endpoint to 
//  Send a JWT to Shinami's zkLogin Wallet Service and create a wallet if no wallet is 
//   associated with the (iss, aud, sub, subWallet) quadruple
app.post('/getWalletSalt', async (req, res, next) => {
    try {
        console.log("calling getOrCreateZkLoginWallet");
        const walletInfo = await walletClient.getOrCreateZkLoginWallet(req.body.jwt);
        res.json({
            salt: walletInfo.salt.toString(),
            walletAddress: walletInfo.address,
            aud: walletInfo.userId.aud,
            sub: walletInfo.userId.keyClaimValue
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
});


// Endpoint to
//  Ask Shinami's prover service for a zkProof
app.post('/getZkProof', async (req, res, next) => {
    try {
        const zkProof = await proverClient.createZkLoginProof(
            req.body.jwt,
            Number(req.body.maxEpoch),
            new Ed25519PublicKey(req.body.publicKey),
            BigInt(req.body.jwtRandomness),
            BigInt(req.body.salt)
        );

        res.json({
            zkProof: zkProof.zkProof
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
});



// Endpoint to:
// 1. Build a gasless move call transaction with the given user input.
// 2. Sponsor it
// 3. Return the sponsored tranaction to the FE
app.post('/buildSponsoredtx', async (req, res, next) => {
    try {
        console.log("building gasless tx");
        const gaslessTx = await buildGasslessMoveCall(req.body.x, req.body.y);
        gaslessTx.sender = req.body.sender;
        console.log("asking for sponsorship");
        const sponsoredTx = await gasClient.sponsorTransaction(gaslessTx);
        console.log("returning sponsorship response");
        res.json({
            txBytes: sponsoredTx.txBytes,
            sponsorSig: sponsoredTx.signature
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
});



// Endpoint to:
// 1. Execute a sponsored transaction, given the transaction and the sender and sponsor signatures.
// 2. Return the SuiTransactionBlockResponse to the FE
app.post('/executeSponsoredTx', async (req, res, next) => {
    try {
        console.log("Attemping to execute the tx...");
        const submitTxResp = await nodeClient.executeTransactionBlock({
            transactionBlock: req.body.txBytes,
            signature: [req.body.senderSig, req.body.sponsorSig]
        });

        res.json(submitTxResp);
    } catch (err) {
        console.log(err);
        next(err);
    }
});



//
// Helper functions
// 

// Build a GaslessTransaction representing a Move call.
// Source code for this example Move function:
// https://github.com/shinamicorp/shinami-typescript-sdk/blob/90f19396df9baadd71704a0c752f759c8e7088b4/move_example/sources/math.move#L13
async function buildGasslessMoveCall(x: number, y: number): Promise<GaslessTransaction> {
    return await buildGaslessTransaction(
        (txb) => {
            txb.moveCall({
                target: `${EXAMPLE_MOVE_PACKAGE_ID}::math::add`,
                arguments: [txb.pure.u64(x), txb.pure.u64(y)],
            });
        },
        {
            sui: nodeClient
        }
    );
}
