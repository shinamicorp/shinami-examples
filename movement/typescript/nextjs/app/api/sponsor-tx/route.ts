import { NextResponse } from "next/server";

import {
    SimpleTransaction,
    Deserializer,
    Hex
} from "@aptos-labs/ts-sdk";
import { GasStationClient } from "@shinami/clients/aptos";

// Endpoint to:
//  1. Sponsor a feePayer SimpleTransaction built on the FE
//  2. Return the feePayer's signature and address to FE
export async function POST(req: Request) {
    if (!process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY) {
        throw Error('SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY .env.local variable not set');
    }
    const gasStationClient = new GasStationClient(process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY!);

    try {

        // Step 1: Sponsor the transaction sent from the FE (after deserializing it)
        const { txSerialized } = await req.json();
        const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(txSerialized).toUint8Array()));
        const feePayerSig = await gasStationClient.sponsorTransaction(simpleTx);

        // Step 2: Send the serialized sponsor AccountAuthenticator and feePayer AccountAddress back to the FE.
        //  Our SDK automatically updates the transaction with the feePayer address post-sponsorship, so we can 
        //  get the address from there and set it on the FE before submitting the tx.
        return NextResponse.json({
            sponsorAuthenticator: feePayerSig.bcsToHex().toString(),
            feePayerAddress: simpleTx.feePayerAddress!.bcsToHex().toString()
        });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to sponsor transaction" }, { status: 500 });
    }
}
