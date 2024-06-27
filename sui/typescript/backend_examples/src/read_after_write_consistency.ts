import { bcs } from '@mysten/sui/bcs';
import { SuiClient, SuiObjectChange } from "@mysten/sui/client";
import { 
    WalletClient, 
    KeyClient, 
    ShinamiWalletSigner, 
    createSuiClient,
    buildGaslessTransaction,
    GaslessTransaction
} from "@shinami/clients/sui";

const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}"
const INVISIBLE_WAL_ID = "{{walletID}}";
const INVISIBLE_WAL_SECRET = "{{walletSecret}}";

// Clients for Shinami's services
const shinamiNodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
// Client to fetch the object version from a Mysten node
const mystenClient = new SuiClient({url: 'https://fullnode.testnet.sui.io'});


// Create a signer for the Invisible Wallet operations
const signer = new ShinamiWalletSigner(
  INVISIBLE_WAL_ID,
  walletClient,
  INVISIBLE_WAL_SECRET,
  keyClient
);

const CREATE_WALLET_IF_NOT_FOUND = true;
const WALLET_ONE_SUI_ADDRESS = await signer.getAddress(CREATE_WALLET_IF_NOT_FOUND);
console.log("Invisible Wallet Sui address:", WALLET_ONE_SUI_ADDRESS);

const OBJECT_TO_TRANSFER_ID = "{{objectID}}";
// Create the GaslessTransaction for sponsorship
const gaslessTx = await buildGaslessTransaction(
  async (txb) => {
    txb.transferObjects([txb.object(OBJECT_TO_TRANSFER_ID)],txb.pure(bcs.Address.serialize(WALLET_ONE_SUI_ADDRESS)));
  },
  {
    sui: shinamiNodeClient
  }
);


// Check the object version pre-transaction
const objInfo = await shinamiNodeClient.getObject({id: OBJECT_TO_TRANSFER_ID});
if (objInfo.data){
  console.log("\nThe object version before the transaction:                              ", objInfo.data.version);
}

//
// Use one of the two methods of read after write
//
await readAfterWriteConsistencyV1(gaslessTx);
// await readAfterWriteConsistencyV2(gaslessTx);



//
// - Getting read-after-write consistency by 
//     1. using "WaitForLocalExecution" so Shinami's Fullnode executes the transaction 
//         locally and updates its state before responding to your request
//     2. using the same (accessKey, IP Address) pair for the read that did for the write, 
//          in order to take advantage of Shinami's sticky routing and reading from the 
//          same Shinami Fullnode that executed the transaction locally
//
async function readAfterWriteConsistencyV1(tx: GaslessTransaction): Promise<void> {
  // Sponsor, sign, and execute the transaction
  const sponsorSignAndExecuteTxResponse = await signer.executeGaslessTransaction(
    tx,
    { showEffects: true },
    "WaitForLocalExecution"
  );

  if (sponsorSignAndExecuteTxResponse.effects?.status.status == "success") {
    // Check the object version on the same Shinami node we wrote to, that executed the
    //  transaction locally
    const shinamiResponse = await shinamiNodeClient.getObject({id: OBJECT_TO_TRANSFER_ID});
    if (shinamiResponse.data){
      console.log("Shinami sticky-routing read object version right after the transaction: ", shinamiResponse.data.version);
    }
    
    // Check the object version on a Mysten node (before the transaction
    //  has been checkpointed and synced across all Full Nodes)
    const mystenResponse = await mystenClient.getObject({id: OBJECT_TO_TRANSFER_ID});
    if (mystenResponse.data){
      console.log("Mysten public node read object version right after the transaction:     ", mystenResponse.data.version);
    }
  }
}



// - Getting read-after-write consistency by polling until the
//    the full node you're reading from has learned about the transaction through 
//    the transaction checkpointing and propagation procesess and updated its state.
async function readAfterWriteConsistencyV2(tx: GaslessTransaction): Promise<void> {
  // Sponsor, sign, and execute the transaction
  const sponsorSignAndExecuteTxResponse = await signer.executeGaslessTransaction(
    tx
  ); // transactions default to "WaitForEffectsCert" and not "WaitForLocalExecution"

  // Poll the Shinami Fullnode until it has a record of the transaction
  const shinamiResponse = await shinamiNodeClient.waitForTransaction({
    digest: sponsorSignAndExecuteTxResponse.digest,
    options: { showObjectChanges: true }
  });
  if (shinamiResponse.objectChanges){
    for (var i = 0; i < shinamiResponse.objectChanges.length; i++) {
      const objChange: SuiObjectChange = shinamiResponse.objectChanges[i];
      if (objChange.type == "mutated" && objChange.objectId == OBJECT_TO_TRANSFER_ID) {
        console.log("Shinami node object version after waiting for transasction propagation: ", objChange.version);
      } 
    }
  }

    // Poll the Mysten Fullnode until it has a record of the transaction
  const mystenResponse = await mystenClient.waitForTransaction({
    digest: sponsorSignAndExecuteTxResponse.digest,
    options: { showObjectChanges: true }
  });
  if (mystenResponse.objectChanges) {
    for (var i = 0; i < mystenResponse.objectChanges.length; i++) {
      const objChange: SuiObjectChange = mystenResponse.objectChanges[i];
      if (objChange.type == "mutated" && objChange.objectId == OBJECT_TO_TRANSFER_ID) {
        console.log(" Mysten node object version after waiting for transasction propagation: ", objChange.version);
      } 
    }
  }

}
