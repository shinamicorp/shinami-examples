import {
    AccountAddress,
    Aptos,
    AptosConfig,
    MoveString,
    Network,
    SimpleTransaction
} from "@aptos-labs/ts-sdk";

export const MODULE_ADDRESS = "0xe56b2729723446cd0836a7d1273809491030ccf2ec9935d598bfdf0bffee4486";


// Build a SimpleTransaction representing a Move call to a module we deployed to Testnet
// https://explorer.movementnetwork.xyz/account/0xe56b2729723446cd0836a7d1273809491030ccf2ec9935d598bfdf0bffee4486/modules/packages/hello_blockchain?network=bardock+testnet
export const buildSimpleMoveCallTransaction = async (sender: AccountAddress, message: string, hasFeePayer: boolean, expirationSeconds?: number): Promise<SimpleTransaction> => {
    const config = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: 'https://testnet.movementnetwork.xyz/v1',
        faucet: 'https://faucet.testnet.movementnetwork.xyz/',
    });
    const movementClient = new Aptos(config);

    const simpleTx = await movementClient.transaction.build.simple({
        sender: sender,
        withFeePayer: true,
        data: {
            function: `${MODULE_ADDRESS}::message::set_message`,
            functionArguments: [new MoveString(message)]
        }
    });
    console.log(simpleTx.feePayerAddress?.toString());

    return await movementClient.transaction.build.simple({
        sender: sender,
        withFeePayer: hasFeePayer,
        data: {
            function: `${MODULE_ADDRESS}::message::set_message`,
            functionArguments: [new MoveString(message)]
        },
        options: {
            expireTimestamp: expirationSeconds
        }
    });
}