// 1. Import everything we'll need for the rest of the tutorial
import { bcs } from '@mysten/sui/bcs';
import { SuiClient, SuiObjectChange, SuiTransactionBlockResponse, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction } from '@mysten/sui/transactions';
import {
  WalletClient,
  KeyClient,
  ShinamiWalletSigner,
  createSuiClient,
  buildGaslessTransaction
} from "@shinami/clients/sui";


// 2. Copy your access key value
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}"


// 3. Set up a wallet id and an associated secret (in a production app you'd store these in a DB for each user)
const INVISIBLE_WAL_ID = "{{walletID}}";
const INVISIBLE_WAL_SECRET = "{{walletSecret}}";


// 4. Instantiate your clients
//   Shinami clients
const shinamiNodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
//    Mysten Full node client
const mystenClient = new SuiClient({ url: getFullnodeUrl('testnet') });


// 5. Create a signer for the Invisible Wallet
const signer = new ShinamiWalletSigner(
  INVISIBLE_WAL_ID,
  walletClient,
  INVISIBLE_WAL_SECRET,
  keyClient
);


// 6. Create the wallet. This request returns the Sui address of an 
//     Invisible Wallet, creating it if it hasn't been created yet
const CREATE_WALLET_IF_NOT_FOUND = true;
const WALLET_ONE_SUI_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);
console.log("Invisible Wallet Sui address:", WALLET_ONE_SUI_ADDRESS);


// 7a. Set OBJECT_TO_TRANSFER_ID to an object owned by the address printed out above. It could
//     be a Testnet SUI coin from the faucet, an NFT from our demo: https://demo.shinami.com/ , etc.
const OBJECT_TO_TRANSFER_ID = "{{objectID}}";
// 7b. Check the object version pre-transaction.
const objInfo = await shinamiNodeClient.getObject({ id: OBJECT_TO_TRANSFER_ID });
if (objInfo.data) {
  console.log("\nThe object version before the transaction:                              ", objInfo.data.version);
}


// 8. Build and submit a transaction to transfer the object back to it's owner. This is a pointless 
//     operation, but it increases the object's sequence (version) number which is what we want.
let tx = new Transaction();
tx.transferObjects([tx.object(OBJECT_TO_TRANSFER_ID)], tx.pure(bcs.Address.serialize(WALLET_ONE_SUI_ADDRESS)));
let sponsorSignAndExecuteTxResponse = await buildAndSubmitGaslessTx(signer, tx);

// 9. Now we parse the response for postTx object info and print it.
let updatedObjInfo = await parseTxResponse(sponsorSignAndExecuteTxResponse);


// 10. Fullnodes won't know the updated verison information right away - it takes a couple seconds
// for transactions to be checkpointed, propagated to Fullnodes, and then processed by the Fullnodes.
// So, when we ask Mysten and Shinami right after the transaction, one or both will often 
// return stale (pre-transaction) information.

// Ask Mysten
const mystenResponse = await mystenClient.getObject({ id: OBJECT_TO_TRANSFER_ID });
if (mystenResponse.data) {
  console.log("Mysten public node read object version right after the transaction:     ", mystenResponse.data.version);
}

// Ask Shinami
const shinamiResponse = await shinamiNodeClient.getObject({ id: OBJECT_TO_TRANSFER_ID });
if (shinamiResponse.data) {
  console.log("Shinami sticky-routing read object version right after the transaction: ", shinamiResponse.data.version);
}

// Therefore, this transaction will usually produce the "Object ID ... is not available for consumption" error due 
//  to this stale information. It will occasionallly succeed because consensus is fast and we've added the delay 
//  we added making the two calls to Fullnodes above.
try {
  tx = new Transaction();
  tx.transferObjects([tx.object(OBJECT_TO_TRANSFER_ID)], tx.pure(bcs.Address.serialize(WALLET_ONE_SUI_ADDRESS)));
  await buildAndSubmitGaslessTx(signer, tx);
} catch (e) {
  console.log(e);
}

// 11. If all you need to do is display information, you can use the data returned 
//  in the SuiTransactionBlockResponse, e.g. balance changes:
console.log("Balance changes post-execution:\n", sponsorSignAndExecuteTxResponse.balanceChanges);


// 12. If you want to send a transction with the same owned object, you can poll the Full node until 
//   it has recieved and processed the transaction digest and then build a new transaction
//
// Ask Shinami
const shinamiData = await shinamiNodeClient.waitForTransaction({
  digest: sponsorSignAndExecuteTxResponse.digest,
  options: { showObjectChanges: true }
});
updatedObjInfo = await parseTxResponse(shinamiData, false);
if (updatedObjInfo) {
  console.log("Shinami node object version after waiting for transaction propagation:  ", updatedObjInfo.version);
}

// Ask Mysten
const mystenData = await mystenClient.waitForTransaction({
  digest: sponsorSignAndExecuteTxResponse.digest,
  options: { showObjectChanges: true }
});
updatedObjInfo = await parseTxResponse(mystenData, false);
if (updatedObjInfo) {
  console.log(" Mysten node object version after waiting for transaction propagation:  ", updatedObjInfo.version);
}

// And then you can build a transaction, which makes requests to the Fullnode to get object and other info.
//  (Transaction.build() is called within 'buildGaslessTransaction' function call inside 'buildAndSubmitGaslessTx'.)
tx = new Transaction();
tx.transferObjects([tx.object(OBJECT_TO_TRANSFER_ID)], tx.pure(bcs.Address.serialize(WALLET_ONE_SUI_ADDRESS)));
sponsorSignAndExecuteTxResponse = await buildAndSubmitGaslessTx(signer, tx);
parseTxResponse(sponsorSignAndExecuteTxResponse);



//
// HELPER FUNCTIONS BELOW
//


//
// Helper function to build and submit a GaslessTransaction
//
async function buildAndSubmitGaslessTx(signer: ShinamiWalletSigner, tx: Transaction): Promise<SuiTransactionBlockResponse> {
  const gaslessTx = await buildGaslessTransaction(tx, { sui: shinamiNodeClient });

  return await signer.executeGaslessTransaction(
    gaslessTx,
    {
      showObjectChanges: true,
      showBalanceChanges: true
    }
  );

}



//
// New type to represent key object data
//
type ObjectInfo = {
  digest: string;
  objectId: string;
  version: string;
}



//
// Helper function to parse a SuiTransactionBlockResponse for the updated object into returned.
//
async function parseTxResponse(response: SuiTransactionBlockResponse, print = true): Promise<ObjectInfo | undefined> {
  const objectChanges = response.objectChanges;
  if (objectChanges) {
    for (var change in objectChanges) {
      const objChange: SuiObjectChange = objectChanges[change];
      if (objChange.type == "mutated" && objChange.objectId == OBJECT_TO_TRANSFER_ID) {
        if (print) {
          console.log("TX response new obj version:                                            ", objChange.version);
        }
        return {
          digest: objChange.digest,
          objectId: objChange.objectId,
          version: objChange.version
        }
      }
    }
  }
}
