import { NextResponse } from "next/server";

import {
    AccountAuthenticator,
    SimpleTransaction,
    Deserializer,
    Hex
} from "@aptos-labs/ts-sdk";
import { GasStationClient } from "@shinami/clients/aptos";

const SHINAMI_MOVEMENT_GAS_STATION_ENDPOINT = 'https://api.us1.shinami.com/movement/gas/v1/';


// Endpoint to:
//  1. Sponsor and submit a SimpleTransaction sent from the FE (given also the sender's signature)
//  2. Return the PendingTransactionResponse to FE
export async function POST(req: Request) {
    if (!process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY) {
        throw Error('SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY .env.local variable not set');
    }

    const gasStationClient = new GasStationClient(process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY!);

    try {

        const { txSerialized, senderSigSerialized } = await req.json();

        const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(txSerialized).toUint8Array()));
        const senderSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(senderSigSerialized).toUint8Array()));
        const resp = await gasStationClient.sponsorAndSubmitSignedTransaction(simpleTx, senderSig);
        return NextResponse.json(resp);

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to sponsor and submit transaction" }, { status: 500 });
    }
}

//
// VERSION TO CALL OUR API DIRECTLY, WITHOUT USING OUR SDK
//
// NOTE: This is currently not built to handle transactions with secondary signers. Logic on how to encode those 
//  can be found here: https://github.com/shinamicorp/shinami-typescript-sdk/blob/main/packages/clients/src/aptos/gas.ts#L137
// export async function POST(req: Request) {
//     try {

//         if (!process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY) {
//             throw Error('SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY .env.local variable not set');
//         }

//         const { rawTxSerialized, senderSigSerialized } = await req.json();

//         const requestBody = {
//             jsonrpc: "2.0",
//             method: "gas_sponsorAndSubmitSignedTransaction",
//             id: 1,
//             params: [
//                 rawTxSerialized,
//                 senderSigSerialized
//             ]
//         }

//         const result = await fetch(SHINAMI_MOVEMENT_GAS_STATION_ENDPOINT, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-API-Key': process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY!
//             },
//             body: JSON.stringify(requestBody)
//         });

//         const data = await result.json();

//         return NextResponse.json(data.result.pendingTransaction);

//     } catch (err) {
//         console.error(err);
//         return NextResponse.json({ error: "Failed to sponsor and submit transaction" }, { status: 500 });
//     }
// }
