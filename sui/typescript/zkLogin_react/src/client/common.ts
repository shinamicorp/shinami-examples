import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from "@mysten/sui/cryptography";
import { PasskeyKeypair } from '@mysten/sui/keypairs/passkey';

const ZKLOGIN_KEYPAIR = "@zklogin/keypair";
const JWT_RANDOMNESS = "@zklogin/jwt_randomness";
const MAX_EPOCH = "@zklogin/max_epoch";
const ZK_WALLET_ADDRESS = "@zklogin/wallet_address";
const ZK_AUD_VALUE = "@zklogin/aud_value";
const ZK_SUB_VALUE = "@zklogin/sub_value";
const SALT = "@zklogin/salt";
const ZK_PROOF = "@zklogin/zkproof";
const PASSKEY_KEYPAIR = "@passkey/keypair";
const PASSKEY_WALLET_ADDRESS = "@passkey/wallet_address";

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

export const storeZkWalletAddress = (address: string): void => {
    sessionStorage.setItem(ZK_WALLET_ADDRESS, address);
}

export const getZkWalletAddress = (): string | null => {
    return sessionStorage.getItem(ZK_WALLET_ADDRESS);
}

export const getSalt = (): string | null => {
    return sessionStorage.getItem(SALT);
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

export const storeZkProof = (proof: object): void => {
    sessionStorage.setItem(ZK_PROOF, JSON.stringify(proof));
}

export const getZkProof = (): object | null => {
    const zkProof = sessionStorage.getItem(ZK_PROOF);
    return zkProof != null ? JSON.parse(zkProof) : zkProof;
}

export const storePasskeyKeypair = (keypair: PasskeyKeypair): void => {
    localStorage.setItem(PASSKEY_KEYPAIR, JSON.stringify(keypair));
}

export const getPasskeyKeypair = (): PasskeyKeypair | null => {
    const keypair = localStorage.getItem(PASSKEY_KEYPAIR);
    return keypair != null ? JSON.parse(keypair) : keypair;
}

export const storePasskeyWalletAddress = (address: string): void => {
    localStorage.setItem(PASSKEY_WALLET_ADDRESS, address);
}

export const getPasskeyWalletAddress = (): string | null => {
    return localStorage.getItem(PASSKEY_WALLET_ADDRESS);
}