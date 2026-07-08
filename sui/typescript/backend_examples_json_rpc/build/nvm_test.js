import { SuiClient } from "@mysten/sui/client";
import { Transaction } from "@mysten/sui/transactions";
import { GasStationClient } from "@shinami/clients/sui";
const SHINAMI_GAS_KEY = "sui_testnet_e7d3fa60be1ad2e4649a4e79e910c04d";
const SENDER_ADDRESS = "0xa8b695e76141d22da386a3df2a29a38840bab343a913f4a4d8e97bb8405ad775";
const gas = new GasStationClient(SHINAMI_GAS_KEY);
const sui = new SuiClient({
    network: "testnet",
    url: "https://api.us1.shinami.com/sui/node/v1/sui_testnet_b31f78ab7077234aae1fb789976fae23",
});
let txb = new Transaction();
txb.moveCall({
    target: "@cetuspackages/inter-mate::zero"
});
const gaslessPayloadBytes = await txb.build({ client: sui, onlyTransactionKind: true });
const gaslessPayloadBase64 = btoa(gaslessPayloadBytes
    .reduce((data, byte) => data + String.fromCharCode(byte), ''));
const gaslessTx = { txKind: gaslessPayloadBase64, sender: SENDER_ADDRESS }; // await buildGaslessTransaction(txb, {sender: SENDER_ADDRESS});
const sponsorResp = await gas.sponsorTransaction(gaslessTx);
console.log(sponsorResp);
