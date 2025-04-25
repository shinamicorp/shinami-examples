import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { PasskeyKeypair } from '@mysten/sui/keypairs/passkey';
import { PartialZkLoginSignature } from './types';
import { normalizedTypeToMoveTypeSignature } from '@mysten/sui/transactions';

const ZKLOGIN_KEYPAIR = "@zklogin/keypair";
const JWT_RANDOMNESS = "@zklogin/jwt_randomness";
const MAX_EPOCH = "@zklogin/max_epoch";
const ZK_WALLET_ADDRESS = "@zklogin/wallet_address";
const ZK_AUD_VALUE = "@zklogin/aud_value";
const ZK_SUB_VALUE = "@zklogin/sub_value";
const SALT = "@zklogin/salt";
const ZK_PROOF = "@zklogin/zkproof";
const PASSKEY_KEYPAIR_PUBLIC_KEY = "@passkey/keypair_public_key";
const PASSKEY_WALLET_ADDRESS = "@passkey/wallet_address";


export const PASSKEY_RP_NAME = "Shinami Gas Station Example";
export const PASSKEY_RP_ID = "shinami_gas_station_example";

// We use sessionStorage because persistent storage of the ephemeral keypair and ZK proof is a security risk.
// See: https://docs.sui.io/guides/developer/cryptography/zklogin-integration#caching-the-ephemeral-private-key-and-zk-proof

export const storeEmphemeralKeypair = (keyPair: Ed25519Keypair): void => {
    sessionStorage.setItem(ZKLOGIN_KEYPAIR, keyPair.getSecretKey());
}

export const getEmphemeralKeypair = (): Ed25519Keypair | null => {
    const encodedKeypair = sessionStorage.getItem(ZKLOGIN_KEYPAIR);
    return encodedKeypair != null ? Ed25519Keypair.fromSecretKey(decodeSuiPrivateKey(encodedKeypair).secretKey) : encodedKeypair;
}

export const storeJWTRandomness = (jwtRandomness: string): void => {
    sessionStorage.setItem(JWT_RANDOMNESS, jwtRandomness);
}

export const getJWTRandomness = (): string | null => {
    return sessionStorage.getItem(JWT_RANDOMNESS);
}

export const storeMaxEpoch = (maxEpoch: number): void => {
    sessionStorage.setItem(MAX_EPOCH, maxEpoch.toString());
}

export const getMaxEpoch = (): number | null => {
    const maxEpoch = sessionStorage.getItem(MAX_EPOCH);
    return maxEpoch != null ? Number(maxEpoch) : maxEpoch;
}

export const storeSalt = (salt: string): void => {
    sessionStorage.setItem(SALT, salt);
}

export const getSalt = (): string | null => {
    return sessionStorage.getItem(SALT);
}

export const storeZkWalletAddress = (address: string): void => {
    sessionStorage.setItem(ZK_WALLET_ADDRESS, address);
}

export const getZkWalletAddress = (): string | null => {
    return sessionStorage.getItem(ZK_WALLET_ADDRESS);
}

export const storeZkAudValue = (aud: string): void => {
    sessionStorage.setItem(ZK_AUD_VALUE, aud);
}

export const getZkAudValue = (): string | null => {
    return sessionStorage.getItem(ZK_AUD_VALUE);
}

export const storeZkSubValue = (sub: string): void => {
    sessionStorage.setItem(ZK_SUB_VALUE, sub);
}

export const getZkSubValue = (): string | null => {
    return sessionStorage.getItem(ZK_SUB_VALUE);
}

export const storeZkProof = (proof: PartialZkLoginSignature): void => {
    sessionStorage.setItem(ZK_PROOF, JSON.stringify(proof));
}

export const getZkProof = (): PartialZkLoginSignature | null => {
    const zkProof = sessionStorage.getItem(ZK_PROOF);
    return zkProof != null ? JSON.parse(zkProof) : zkProof;
}

// Clear all zkLogin session values when the user logs out
export const clearZkLoginSessionData = (): void => {
    sessionStorage.removeItem(ZK_PROOF);
    sessionStorage.removeItem(ZK_SUB_VALUE);
    sessionStorage.removeItem(ZK_AUD_VALUE);
    sessionStorage.removeItem(ZK_WALLET_ADDRESS);
    sessionStorage.removeItem(SALT);
    sessionStorage.removeItem(MAX_EPOCH);
    sessionStorage.removeItem(JWT_RANDOMNESS);
    sessionStorage.removeItem(ZKLOGIN_KEYPAIR);
}

export const storePasskeyKeypairPublicKey = (publicKey: string): void => {
    localStorage.setItem(PASSKEY_KEYPAIR_PUBLIC_KEY, publicKey);
}

export const getPasskeyKeypairPublicKey = (): string | null => {
    return localStorage.getItem(PASSKEY_KEYPAIR_PUBLIC_KEY);
}

export const storePasskeyWalletAddress = (address: string): void => {
    localStorage.setItem(PASSKEY_WALLET_ADDRESS, address);
}

export const getPasskeyWalletAddress = (): string | null => {
    return localStorage.getItem(PASSKEY_WALLET_ADDRESS);
}
