'use server';

import {
    AccountAuthenticator,
    SimpleTransaction,
    Deserializer,
    Hex
} from "@aptos-labs/ts-sdk";
import { GasStationClient } from "@shinami/clients/aptos";

export async function sponsorAndSubmitSignedTx(txSerialized: string, senderSigSerialized: string) {
    if (!process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY) {
        throw Error('SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY .env.local variable not set');
    }
    const gasStationClient = new GasStationClient(process.env.SHINAMI_PRIVATE_BACKEND_GAS_STATION_API_KEY!);

    try {
        // Step 1: Sponsor and submit the transaction
        //          First, deserialize the SimpleTransaction and sender AccountAuthenticator sent from the FE
        const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(txSerialized).toUint8Array()));
        const senderSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(senderSigSerialized).toUint8Array()));
        return await gasStationClient.sponsorAndSubmitSignedTransaction(simpleTx, senderSig);
    } catch (err) {
        console.log(err);
    }
}