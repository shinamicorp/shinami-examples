import express from "express";
import ViteExpress from "vite-express";
import { 
  GasStationClient, 
  createSuiClient,
  buildGaslessTransactionBytes,
  WalletClient,
  ShinamiWalletSigner,
  KeyClient
} from "@shinami/clients/sui";
import { 
  ALL_SERVICES_TESTNET_ACCESS_KEY,
  EXAMPLE_MOVE_PACKAGE_ID,
  USER_ID_TO_INVISIBLE_WALLET_ID_AND_SECRET_MAP 
} from "./envs.ts";

const app = express();
app.use(express.json());


app.post('/buildSponsoredtx', async (req, res, next) => {
  try {
  const gaslessTxBytes = await buildGasslessMoveCall(req.body.x, req.body.y);
  const sponsorship = await gasClient.sponsorTransactionBlock(gaslessTxBytes, req.body.sender);
  res.json(sponsorship);
  } catch (err) {
      next(err)
  }
});

app.post('/invisibleWalletTx', async (req, res, next) => {
  const x = req.body.x;
  const y = req.body.y;
  const userId = req.body.userId
  try {
    const gaslessTxBytes = await buildGasslessMoveCall(req.body.x, req.body.y);
    const sponsorAndExecuteResp =  await sponsorAndExecuteTransactionForUser(gaslessTxBytes, req.body.userId);
    res.json(sponsorAndExecuteResp);
  } catch (err) {
      next(err)
  }
})

ViteExpress.listen(app, 3000, () =>
  console.log("Server is listening on port 3000..."),
);



const sui = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const gasClient = new GasStationClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);

async function sponsorAndExecuteTransactionForUser(gaslessTxBytes: string, userId: string) {
  const walletInfo = USER_ID_TO_INVISIBLE_WALLET_ID_AND_SECRET_MAP.get(userId);
  const signer = new ShinamiWalletSigner(
    walletInfo.walletId,
    walletClient,
    walletInfo.walletSecret,
    keyClient
  );
  
  const CREATE_WALLET_IF_NOT_FOUND = true;
  let WALLET_ONE_SUI_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);
  return await signer.executeGaslessTransactionBlock(gaslessTxBytes);
}



async function buildGasslessMoveCall(x: number, y: number): Promise<string> {
  return await buildGaslessTransactionBytes({
    sui,
    build: async (txb) => {
      // Source code for this example Move function:
      // https://github.com/shinamicorp/shinami-typescript-sdk/blob/90f19396df9baadd71704a0c752f759c8e7088b4/move_example/sources/math.move#L13
      txb.moveCall({
        target: `${EXAMPLE_MOVE_PACKAGE_ID}::math::add`,
        arguments: [txb.pure(x), txb.pure(y)],
      });
    },
  });
}