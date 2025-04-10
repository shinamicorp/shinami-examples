import express from "express";
import ViteExpress from "vite-express";
import {
  GasStationClient,
  createSuiClient,
  buildGaslessTransaction,
  WalletClient,
  ShinamiWalletSigner,
  KeyClient,
  GaslessTransaction
} from "@shinami/clients/sui";
import dotenvFlow from 'dotenv-flow';

// Get our environmental variables from our .env.local file
dotenvFlow.config();
const ALL_SERVICES_TESTNET_ACCESS_KEY = process.env.ALL_SERVICES_TESTNET_ACCESS_KEY;
const EXAMPLE_MOVE_PACKAGE_ID = process.env.EXAMPLE_MOVE_PACKAGE_ID;
const USER123_WALLET_SECRET = process.env.USER123_WALLET_SECRET;
const USER123_WALLET_ID = process.env.USER123_WALLET_ID;

if (!(ALL_SERVICES_TESTNET_ACCESS_KEY && EXAMPLE_MOVE_PACKAGE_ID)) {
  throw Error('ALL_SERVICES_TESTNET_ACCESS_KEY and/or EXAMPLE_MOVE_PACKAGE_ID .env.local variables not set');
}
if (!(USER123_WALLET_ID && USER123_WALLET_SECRET)) {
  throw Error('USER123_WALLET_ID and/or USER123_WALLET_SECRET .env.local varaibles not set');
}

// Create Shinami clients for sponsoring and executing transactions and for our Invisible Wallet operations.
const nodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const gasClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

// Create our Invisible Wallet 
const signer = new ShinamiWalletSigner(
  USER123_WALLET_ID,
  walletClient,
  USER123_WALLET_SECRET,
  keyClient
);
const CREATE_WALLET_IF_NOT_FOUND = true;
const WALLET_ONE_SUI_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);
console.log("Invisible wallet address:", WALLET_ONE_SUI_ADDRESS.toString());

// To use in case we don't want to send the sender signature to the FE.
// If you want to get a signature on the FE but not let the user submit the 
//  transaction until after you perform additional checks and then submit the
//  transaction on the BE, you can do this by not sending the sponsor signature
//  to the FE. Of course, in production you'd likely use a db where you store 
//   other info alongside each signature, like the tx digest and tx bytes.
const KEEP_SENDER_SIGNATURE_ON_BE = false; // must be set to false if the FE is submitting the tx
let backendSponsorSignature: string | undefined = undefined;

// Initilaize our server
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
// 1. Build and a Move call transaction with the given user intput
// 2. Sponsor, sign, and execute it for an Invisible Wallet sender
// 3. Return the SuiTransactionBlockResponse to the FE
app.post('/invisibleWalletTx', async (req, res, next) => {
  try {
    const gaslessTx = await buildGasslessMoveCall(req.body.x, req.body.y);
    // We'll set the sender as a part of this request.
    const sponsorAndExecuteResp = await signer.executeGaslessTransaction(gaslessTx);
    res.json(sponsorAndExecuteResp);
  } catch (err) {
    next(err);
  }
});



// Endpoint to:
// 1. Build a gasless move call
// 2. Sponsor it
// 3. Return the sponsored tranaction to the FE
// Build and sponsor a Move call transaction with the given user input.
app.post('/buildSponsoredtx', async (req, res, next) => {
  try {
    const gaslessTx = await buildGasslessMoveCall(req.body.x, req.body.y);
    // Set the sender before sponsorship
    gaslessTx.sender = req.body.sender;
    const sponsoredTx = await gasClient.sponsorTransaction(gaslessTx);

    if (KEEP_SENDER_SIGNATURE_ON_BE) {
      backendSponsorSignature = sponsoredTx.signature;
    }

    res.json({
      txBytes: sponsoredTx.txBytes,
      sponsorSig: KEEP_SENDER_SIGNATURE_ON_BE ? undefined : sponsoredTx.signature
    });

  } catch (err) {
    next(err);
  }
});



// Endpoint to:
// 1. Execute a sponsored transaction, given the transaction and the sender and sponsor signatures.
// 2. Return the SuiTransactionBlockResponse to the FE
app.post('/executeSponsoredTx', async (req, res, next) => {
  const sponsorSig = KEEP_SENDER_SIGNATURE_ON_BE ? backendSponsorSignature : req.body.sponsorSig;
  try {
    const submitTxResp = await nodeClient.executeTransactionBlock({
      transactionBlock: req.body.tx,
      signature: [req.body.senderSig, sponsorSig]
    });

    res.json(submitTxResp);
  } catch (err) {
    next(err);
  }
});



//
// Helper functions
// 

// Build a GaslessTransaction representing a Move call.
// Source code for this example Move function:
// https://github.com/shinamicorp/shinami-typescript-sdk/blob/90f19396df9baadd71704a0c752f759c8e7088b4/move_example/sources/math.move#L13
async function buildGasslessMoveCall(x: number, y: number): Promise<GaslessTransaction> {
  return await buildGaslessTransaction(
    (txb) => {
      txb.moveCall({
        target: `${EXAMPLE_MOVE_PACKAGE_ID}::math::add`,
        arguments: [txb.pure.u64(x), txb.pure.u64(y)],
      });
    },
    {
      sui: nodeClient
    }
  );
}
