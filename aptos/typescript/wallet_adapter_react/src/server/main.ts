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
  MoveString,
  Deserializer,
  Hex,
  AccountAuthenticator
} from "@aptos-labs/ts-sdk";

dotenvFlow.config();
export const ALL_SERVICES_TESTNET_ACCESS_KEY = process.env.ALL_SERVICES_TESTNET_ACCESS_KEY;
export const USER123_WALLET_SECRET = process.env.USER123_WALLET_SECRET;
export const USER123_WALLET_ID = process.env.USER123_WALLET_ID;


if (!(ALL_SERVICES_TESTNET_ACCESS_KEY)) {
  throw Error('ALL_SERVICES_TESTNET_ACCESS_KEY .env.local variable not set');
}
// Create an Aptos client for building and submitting our transactions.
const aptosClient = new Aptos(new AptosConfig({ network: Network.TESTNET}));

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
console.log(WALLET_ONE_SUI_ADDRESS.toString());

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



app.post('/buildAndSponsorTx', async (req, res, next) => {
  try {

    // Step 1: Build a SimpleTransaction with the values sent from the FE
    //   Set a five min expiration to be safe since we'll wait on a user signature (SDK default = 20 seconds)
    const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
    const simpleTx : SimpleTransaction = await buildSimpleMoveCallTransaction(AccountAddress.from(req.body.sender), req.body.message, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

    // Step 2: Sponsor the transaction
    const sponsorAuth = await gasClient.sponsorTransaction(simpleTx);

    // Step 3: Send the serialized SimpleTransaction and sponsor AccountAuthenticator back to the FE
    res.json({
      sponsorAuthenticator: sponsorAuth.bcsToHex().toString(),
      simpleTx: simpleTx.bcsToHex().toString()
    });
  } catch (err) {
      next(err);
  }
});


app.post('/sponsorTx', async (req, res, next) => {
  try {
    // Step 1: Deserialize the transaction sent from the FE
    const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(req.body.transaction).toUint8Array()));

    // Step 2: Sponsor the transaction
    const sponsorAuth = await gasClient.sponsorTransaction(simpleTx);
    console.log("sponsorAuth: ",sponsorAuth);

    // Step 3: Send the serialized sponsor AccountAuthenticator and feePayer AccountAddress back to the FE
    res.json({
      sponsorAuthenticator: sponsorAuth.bcsToHex().toString(),
      feePayerAddress: simpleTx.feePayerAddress!.bcsToHex().toString()
    });
  } catch (err) {
      next(err);
  }
});


// Given a serialized SimpleTransaction and AccountAuthenticator (representing the sender's signature),
//  sponsor and submit it. Return the associated PendingTransactionResponse
app.post('/sponsorAndSubmitTx', async (req, res, next) => {
  try {
    // Step 1: Deserialize the SimpleTransaction and sender AccountAuthenticator sent from the FE
    console.log("deserlializing the transaction");
    const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(req.body.transaction).toUint8Array()));
    console.log("deserlializing the sender authenticator");
    const senderSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(req.body.senderAuth).toUint8Array()));

    // Step 2: Sponsor and submit the transaction
    const pendingTransaction = await gasClient.sponsorAndSubmitSignedTransaction(simpleTx, senderSig);

    // Step 3: Send the PendingTransactionResponse back to the FE
    console.log("sending back pendingTx:", pendingTransaction);
    res.json({
      pendingTx: pendingTransaction
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
  let transaction = await aptosClient.transaction.build.simple({
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
