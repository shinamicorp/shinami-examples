// Code taken from https://aptos.dev/en/build/guides/aptos-keyless/integration-guide
// deleteEphemeralKeyPair() added

import { EphemeralKeyPair } from '@aptos-labs/ts-sdk';

const APTOS_EKP_KEY = "@aptos/ekp";

/**
 * Store the ephemeral key pair in localStorage.
 */
export const storeEphemeralKeyPair = (ekp: EphemeralKeyPair): void =>
    localStorage.setItem(APTOS_EKP_KEY, encodeEphemeralKeyPair(ekp));

/**
 * 
 * Delete ephemeral key pair from localStorage. 
 */
export const deleteEphemeralKeyPair = (): void =>
    localStorage.removeItem(APTOS_EKP_KEY);


/**
 * Retrieve the ephemeral key pair from localStorage if it exists.
 */
export const getLocalEphemeralKeyPair = (): EphemeralKeyPair | undefined => {
    try {
        const encodedEkp = localStorage.getItem(APTOS_EKP_KEY);
        return encodedEkp ? decodeEphemeralKeyPair(encodedEkp) : undefined;
    } catch (error) {
        console.warn(
            "Failed to decode ephemeral key pair from localStorage",
            error
        );
        return undefined;
    }
};

/**
 * Stringify the ephemeral key pairs to be stored in localStorage
 */
export const encodeEphemeralKeyPair = (ekp: EphemeralKeyPair): string =>
    JSON.stringify(ekp, (_, e) => {
        if (typeof e === "bigint") return { __type: "bigint", value: e.toString() };
        if (e instanceof Uint8Array)
            return { __type: "Uint8Array", value: Array.from(e) };
        if (e instanceof EphemeralKeyPair)
            return { __type: "EphemeralKeyPair", data: e.bcsToBytes() };
        return e;
    });

/**
 * Parse the ephemeral key pairs from a string
 */
export const decodeEphemeralKeyPair = (encodedEkp: string): EphemeralKeyPair =>
    JSON.parse(encodedEkp, (_, e) => {
        if (e && e.__type === "bigint") return BigInt(e.value);
        if (e && e.__type === "Uint8Array") return new Uint8Array(e.value);
        if (e && e.__type === "EphemeralKeyPair")
            return EphemeralKeyPair.fromBytes(e.data);
        return e;
    });
