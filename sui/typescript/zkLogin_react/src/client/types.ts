import { getZkLoginSignature } from '@mysten/sui/zklogin';


// See: https://docs.sui.io/guides/developer/cryptography/zklogin-integration#how-to-handle-cors-error
export type PartialZkLoginSignature = Omit<
    Parameters<typeof getZkLoginSignature>['0']['inputs'],
    'addressSeed'
>;

export type ZkLoginProof = Parameters<typeof getZkLoginSignature>["0"]["inputs"];
