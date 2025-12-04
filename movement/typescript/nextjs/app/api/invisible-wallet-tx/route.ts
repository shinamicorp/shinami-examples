import { NextResponse } from "next/server";
import {
    WalletClient,
    ShinamiWalletSigner,
    KeyClient
} from "@shinami/clients/aptos";
import { buildSimpleMoveCallTransaction } from "@/app/lib/utils";

// Endpoint to:
//  1. Sponsor a feePayer SimpleTransaction built on the FE
//  2. Return the feePayer's signature and address to FE
export async function POST(req: Request) {
    if (!process.env.SHINAMI_PRIVATE_BACKEND_GAS_AND_WALLET_API_KEY) {
        throw Error('SHINAMI_PRIVATE_BACKEND_GAS_AND_WALLET_API_KEY .env.local variable not set');
    }
    if (!process.env.USER123_WALLET_ID) {
        throw Error('USER123_WALLET_ID .env.local variable not set');
    }
    if (!process.env.USER123_WALLET_SECRET) {
        throw Error('USER123_WALLET_SECRET .env.local variable not set');
    }

    // Create Shinami clients for sponsoring transactions and handling Invisible Wallet operations
    const keyClient = new KeyClient(process.env.SHINAMI_PRIVATE_BACKEND_GAS_AND_WALLET_API_KEY);
    const walletClient = new WalletClient(process.env.SHINAMI_PRIVATE_BACKEND_GAS_AND_WALLET_API_KEY);


    // Create our Invisible Wallet 
    const signer = new ShinamiWalletSigner(
        process.env.USER123_WALLET_ID,
        walletClient,
        process.env.USER123_WALLET_SECRET,
        keyClient
    );
    const CREATE_WALLET_IF_NOT_FOUND = true;
    const WALLET_ONE_MOVEMENT_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);
    console.log("Invisible wallet address:", WALLET_ONE_MOVEMENT_ADDRESS.toString());

    try {

        // Step 1: Sponsor the transaction sent from the FE (after deserializing it)
        const { message } = await req.json();

        // Step 1: Build a feePayer SimpleTransaction with the values sent from the FE
        //     Use the SDK's default transaction expiration of 20 seconds since we'll immediately sign and submit.
        const HAS_FEEPAYER = true;
        const simpleTx = await buildSimpleMoveCallTransaction(WALLET_ONE_MOVEMENT_ADDRESS, message, HAS_FEEPAYER);

        // Step 2: Sign, sponsor, and submit the transaction for our Invisible Wallet sender
        const pendingTransaction = await signer.executeGaslessTransaction(simpleTx);

        // Step 2: Send the serialized sponsor AccountAuthenticator and feePayer AccountAddress back to the FE.
        //  Our SDK automatically updates the transaction with the feePayer address post-sponsorship, so we can 
        //  get the address from there and set it on the FE before submitting the tx.
        return NextResponse.json(pendingTransaction);

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to sponsor and submit invisible wallet transaction" }, { status: 500 });
    }
}
