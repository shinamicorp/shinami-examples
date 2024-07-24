import express from "express";
import ViteExpress from "vite-express";
import { 
  GasStationClient, 
  WalletClient,
  ShinamiWalletSigner,
  KeyClient
} from "@shinami/clients/aptos";
import dotenvFlow from 'dotenv-flow';

import { 
  Aptos, 
  AptosConfig,
  Network, 
  AccountAddress, 
  SimpleTransaction,
  MoveString
} from "@aptos-labs/ts-sdk";

dotenvFlow.config();
export const ALL_SERVICES_TESTNET_ACCESS_KEY = process.env.ALL_SERVICES_TESTNET_ACCESS_KEY;
export const USER123_WALLET_SECRET = process.env.USER123_WALLET_SECRET;
export const USER123_WALLET_ID = process.env.USER123_WALLET_ID;


if (!(ALL_SERVICES_TESTNET_ACCESS_KEY)) {
  throw Error('ALL_SERVICES_TESTNET_ACCESS_KEY .env.local variable not set');
}
// Create an Aptos client for building and submitting our transactions.
const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET}));

// Create Shinami clients for sponsoring transactions and for our
//  Invisible Wallet operations.
const gasClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

if (!(USER123_WALLET_ID && USER123_WALLET_SECRET)){
  throw Error('USER123_WALLET_ID and/or USER123_WALLET_SECRET .env.local varaibles not set');
}

// Create our Invisible Wallet 
const signer = new ShinamiWalletSigner(
  USER123_WALLET_ID,
  walletClient,
  USER123_WALLET_SECRET,
  keyClient
);
const CREATE_WALLET_IF_NOT_FOUND = true;
const WALLET_ONE_SUI_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);

const app = express();
app.use(express.json());

// Build and a Move call transaction with the given user intput.
//Then, sponsor, sign, and execute it for an Invisible Wallet sender.
app.post('/invisibleWalletTx', async (req, res, next) => {
  try {
    const message = req.body.message;
    const simpleTx = await buildSimpleMoveCallTransaction(WALLET_ONE_SUI_ADDRESS, message);
    const sponsorAndExecuteResp =  await signer.executeGaslessTransaction(simpleTx);
    res.json(sponsorAndExecuteResp);
  } catch (err) {
      next(err);
  }
});


// Build and sponsor a Move call transaction with the given user input.
app.post('/buildAndSponsorTx', async (req, res, next) => {
  try {
    const message = req.body.message;
    const senderAddress = req.body.sender;

    const simpleTx : SimpleTransaction = await buildSimpleMoveCallTransaction(senderAddress, message);
    const sponsorAuth = await gasClient.sponsorTransaction(simpleTx);

    res.json({
      sponsorAuth: sponsorAuth.bcsToHex().toString(),
      transaction: simpleTx.bcsToHex().toString()
    });
  } catch (err) {
      next(err);
  }
});


ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);


// Build a SimpleTransaction representing a Move call.
// Source code for this example Move function:
// ...
async function buildSimpleMoveCallTransaction(sender: AccountAddress, message: string, expirationSeconds?: number): Promise<SimpleTransaction> {
  let transaction = await aptos.transaction.build.simple({
      sender: sender,
      withFeePayer: true,
      data: {
        function: "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::set_message",
        functionArguments: [new MoveString(message)]
      },
      options: {
          expireTimestamp: expirationSeconds
      }
  });
  return transaction;
}
