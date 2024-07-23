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

dotenvFlow.config();
export const ALL_SERVICES_TESTNET_ACCESS_KEY = process.env.ALL_SERVICES_TESTNET_ACCESS_KEY;
export const EXAMPLE_MOVE_PACKAGE_ID = process.env.EXAMPLE_MOVE_PACKAGE_ID;
export const USER123_WALLET_SECRET = process.env.USER123_WALLET_SECRET;
export const USER123_WALLET_ID = process.env.USER123_WALLET_ID;


if (!(ALL_SERVICES_TESTNET_ACCESS_KEY && EXAMPLE_MOVE_PACKAGE_ID)) {
  throw Error('ALL_SERVICES_TESTNET_ACCESS_KEY and/or EXAMPLE_MOVE_PACKAGE_ID .env.local variables not set');
}
const nodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const gasClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

const app = express();
app.use(express.json());

// Build and a Move call transaction with the given user intput.
//Then, sponsor, sign, and execute it for an Invisible Wallet sender.
app.post('/invisibleWalletTx', async (req, res, next) => {
  try {
    const gaslessTx = await buildGasslessMoveCall(req.body.x, req.body.y);
    if (USER123_WALLET_ID && USER123_WALLET_SECRET){
      const sponsorAndExecuteResp =  await sponsorAndExecuteTransactionForWallet(gaslessTx, USER123_WALLET_ID, USER123_WALLET_SECRET);
      res.json(sponsorAndExecuteResp);
    } else {
      throw Error('USER123_WALLET_ID and/or USER123_WALLET_SECRET .env.local varaibles not set');
    }
  } catch (err) {
      next(err);
  }
});


// Build and sponsor a Move call transaction with the given user input.
app.post('/buildSponsoredtx', async (req, res, next) => {
  try {
    const gaslessTx = await buildGasslessMoveCall(req.body.x, req.body.y);
    gaslessTx.sender = req.body.sender;
    const sponsorship = await gasClient.sponsorTransaction(gaslessTx);
  res.json(sponsorship);
  } catch (err) {
      next(err);
  }
});


// Execute a sponsored tranasction, given the transction and the sender and sponsor signature.
app.post('/executeSponsoredTx', async (req, res, next) => {
try {
  const submitTxResp = await nodeClient.executeTransactionBlock({
    transactionBlock: req.body.tx,
    signature: [req.body.senderSig, req.body.sponsorSig]
  });
  res.json(submitTxResp);
} catch (err) {
    next(err);
}
});

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);


// Sign, sponsor, and execute a GaslessTransaction for an Invisible Wallet sender.
async function sponsorAndExecuteTransactionForWallet(gaslessTx: GaslessTransaction, walletId: string, walletSecret: string) {
  const signer = new ShinamiWalletSigner(
    walletId,
    walletClient,
    walletSecret,
    keyClient
  );
  
  const CREATE_WALLET_IF_NOT_FOUND = true;
  const WALLET_ONE_SUI_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);
  gaslessTx.sender = WALLET_ONE_SUI_ADDRESS;
  return await signer.executeGaslessTransaction(gaslessTx);
}


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
