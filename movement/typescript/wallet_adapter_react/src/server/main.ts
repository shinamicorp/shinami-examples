import express from "express";
import ViteExpress from "vite-express";
import { GasStationClient } from "@shinami/clients/aptos";
import dotenvFlow from 'dotenv-flow';

import {
  AccountAddress,
  AccountAuthenticator,
  Aptos,
  AptosConfig,
  SimpleTransaction,
  Deserializer,
  Hex,
  MoveString,
  Network
} from "@aptos-labs/ts-sdk";

// Get our environmental variables from our .env.local file
dotenvFlow.config();
export const GAS_STATION_TESTNET_BE_KEY = process.env.GAS_STATION_TESTNET_BE_KEY;

if (!(GAS_STATION_TESTNET_BE_KEY)) {
  throw Error('GAS_STATION_TESTNET_BE_KEY .env.local variable not set');
}

// Create a Shinami client for sponsoring transactions and a Movement client for submitting transactions to a full node.
const gasClient = new GasStationClient(GAS_STATION_TESTNET_BE_KEY);

// Initialize the Movement client
const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: 'https://testnet.movementnetwork.xyz/v1',
  faucet: 'https://faucet.testnet.movementnetwork.xyz/',
});
const movementClient = new Aptos(config);


// initilaize our server
const app = express();
app.use(express.json());

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);


//
// Endpoints
//
// NOTE: All of these APIs are UNAUTHENTICATED. You must add your own user auth / session management
//       to secure them if you use them in an actual production app with real users.
//




// Endpoint to:
//  1. Build and a feePayer SimpleTransaction call transaction with the given user input.
//  2. Sponsor the transaction
//  3. Return the sponsor's signature and the transaction to FE
app.post('/buildAndSponsorTx', async (req, res, next) => {
  try {
    // Step 1: Build a feePayer SimpleTransaction with the values sent from the FE
    //   Set a five min expiration to be safe since we'll wait on a user signature (SDK default = 20 seconds)
    const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
    const simpleTx: SimpleTransaction = await buildSimpleMoveCallTransaction(AccountAddress.from(req.body.sender), req.body.message, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

    // Step 2: Sponsor the transaction
    const sponsorAuth = await gasClient.sponsorTransaction(simpleTx);

    // Step 3: Send the serialized SimpleTransaction and sponsor (feePayer) AccountAuthenticator back to the FE
    res.json({
      sponsorAuthenticator: sponsorAuth.bcsToHex().toString(),
      simpleTx: simpleTx.bcsToHex().toString()
    });
  } catch (err) {
    next(err);
  }
});



// Endpoint to:
//  1. Sponsor a feePayer SimpleTransaction built on the FE
//  2. Return the feePayer's signature and address to FE
app.post('/sponsorTx', async (req, res, next) => {
  try {
    // Step 1: Sponsor the transaction sent from the FE (after deserializing it)
    const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(req.body.transaction).toUint8Array()));
    const feePayerSig = await gasClient.sponsorTransaction(simpleTx);

    // Step 2: Send the serialized sponsor AccountAuthenticator and feePayer AccountAddress back to the FE
    res.json({
      sponsorAuthenticator: feePayerSig.bcsToHex().toString(),
      feePayerAddress: simpleTx.feePayerAddress!.bcsToHex().toString()
    });
  } catch (err) {
    next(err);
  }
});



// Endpoint to:
//  1. Sponsor and submit a SimpleTransaction sent from the FE (given also the sender's signature)
//  2. Return the PendingTransactionResponse to FE
app.post('/sponsorAndSubmitTx', async (req, res, next) => {
  try {
    // Step 1: Sponsor and submit the transaction
    //          First, deserialize the SimpleTransaction and sender AccountAuthenticator sent from the FE
    const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(req.body.transaction).toUint8Array()));
    const senderSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(req.body.senderAuth).toUint8Array()));
    const pendingTransaction = await gasClient.sponsorAndSubmitSignedTransaction(simpleTx, senderSig);

    // Step 2: Send the PendingTransactionResponse back to the FE
    res.json({
      pendingTx: pendingTransaction
    });
  } catch (err) {
    next(err);
  }
});



// Endpoint to:
//  1. Submit a sponsored SimpleTransaction sent from the FE (given also the sender and feePayer signatures)
//  2. Return the PendingTransactionResponse to FE
app.post('/submitSponsoredTx', async (req, res, next) => {
  try {
    // Step 1: submit the transaction and associated signatures after deserializing them
    const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(req.body.transaction).toUint8Array()));
    const senderSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(req.body.senderAuth).toUint8Array()));
    const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(req.body.sponsorAuth).toUint8Array()));

    const pendingTransaction = await movementClient.transaction.submit.simple({
      transaction: simpleTx,
      senderAuthenticator: senderSig,
      feePayerAuthenticator: sponsorSig,
    });

    // Step 2: Send the PendingTransactionResponse back to the FE
    res.json({
      pendingTx: pendingTransaction
    });
  } catch (err) {
    next(err);
  }
});


//
// Helper functions
// 

// Build a SimpleTransaction representing a Move call to a module we deployed to Testnet
// https://explorer.movementnetwork.xyz/account/0xe56b2729723446cd0836a7d1273809491030ccf2ec9935d598bfdf0bffee4486/modules/packages/hello_blockchain?network=bardock+testnet
async function buildSimpleMoveCallTransaction(sender: AccountAddress, message: string, expirationSeconds?: number): Promise<SimpleTransaction> {
  let transaction = await movementClient.transaction.build.simple({
    sender: sender,
    withFeePayer: true,
    data: {
      function: "0xe56b2729723446cd0836a7d1273809491030ccf2ec9935d598bfdf0bffee4486::message::set_message",
      functionArguments: [new MoveString(message)]
    },
    options: {
      expireTimestamp: expirationSeconds
    }
  });
  return transaction;
}
