// 1. Import everything we'll need for the rest of the tutorial
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

// 2. Copy your access key value
const ALL_SERVICES_TESTNET_ACCESS_KEY = "{{allServicesTestnetAccessKey}}"

// 3. Set up a wallet id and an associated secret
const INVISIBLE_WAL_ID = "{{walletID}}";
const INVISIBLE_WAL_SECRET = "{{walletSecret}}";

// 4. Instantiate your clients
//   Shinami clients
const shinamiNodeClient = createSuiClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const keyClient = new KeyClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
const walletClient = new WalletClient(ALL_SERVICES_TESTNET_ACCESS_KEY);
//    Mysten Full node client
const mystenClient = new SuiClient({url: 'https://fullnode.testnet.sui.io'});


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


// 7. Generate a GaslessTransaction for sponsorship. This is a trivial
//     transaction that transfers an owned object back to its owner (the 
//     Invisible Wallet we created). This transfer will bump the object's 
//     version (sequence) number, which is what we'll be checking when we  
//     query Full nodes below after our writes. Set this to an object owned 
//     by the address  printed out above. It could be a Testnet SUI coin 
//     from the faucet, or an NFT from our demo: https://demo.shinami.com/
const OBJECT_TO_TRANSFER_ID = "{{objectID}}";
const gaslessTx = await buildGaslessTransaction(
  async (txb) => {
    txb.transferObjects([txb.object(OBJECT_TO_TRANSFER_ID)],txb.pure(bcs.Address.serialize(WALLET_ONE_SUI_ADDRESS)));
  },
  {
    sui: shinamiNodeClient
  }
);


// 8. Check the object version pre-transaction
const objInfo = await shinamiNodeClient.getObject({id: OBJECT_TO_TRANSFER_ID});
if (objInfo.data){
  console.log("\nThe object version before the transaction:                              ", objInfo.data.version);
}

//
// 9. Use one of the two methods of read after write
//
await readAfterWriteConsistencyV1(gaslessTx);
// await readAfterWriteConsistencyV2(gaslessTx);



//
// - Getting read-after-write consistency by 
//     1. using "WaitForLocalExecution" so Shinami's Full node executes the transaction 
//         locally and updates its state before responding to your request
//     2. using the same (accessKey, IP Address) pair for the read that did for the write, 
//          in order to take advantage of Shinami's sticky routing and reading from the 
//          same Shinami Full node that executed the transaction locally
//
async function readAfterWriteConsistencyV1(tx: GaslessTransaction): Promise<void> {
  // 1. Sponsor, sign, and execute the transaction with request_type: "WaitForLocalExecution"
  const sponsorSignAndExecuteTxResponse = await signer.executeGaslessTransaction(
    tx,
    { showEffects: true },
    "WaitForLocalExecution"
  );

  if (sponsorSignAndExecuteTxResponse.effects?.status.status == "success") {
    // 2. Check the object version on the same Shinami node we wrote to, that executed the
    //  transaction locally. This will produce the correct, updated version number.
    const shinamiResponse = await shinamiNodeClient.getObject({id: OBJECT_TO_TRANSFER_ID});
    if (shinamiResponse.data){
      console.log("Shinami sticky-routing read object version right after the transaction: ", shinamiResponse.data.version);
    }
    
    // 3. Check the object version on a Mysten node (before the transaction
    //  has been checkpointed and synced across all Full nodes). This will 
    //  produce the pre-transaction version number.
    const mystenResponse = await mystenClient.getObject({id: OBJECT_TO_TRANSFER_ID});
    if (mystenResponse.data){
      console.log("Mysten public node read object version right after the transaction:     ", mystenResponse.data.version);
    }
  }
}



// - Getting read-after-write consistency by polling until the
//    Full node you're reading from has learned about the transaction through 
//    the transaction checkpointing and propagation procesess and updated its state.
async function readAfterWriteConsistencyV2(tx: GaslessTransaction): Promise<void> {
  // 1. Sponsor, sign, and execute the transaction (transactions default to "WaitForEffectsCert")
  const sponsorSignAndExecuteTxResponse = await signer.executeGaslessTransaction(
    tx
  ); 

  // 2. Poll the Shinami Full node until it has a record of the transaction.
  //    This will produce the correct, updated version number.
  const shinamiResponse = await shinamiNodeClient.waitForTransaction({
    digest: sponsorSignAndExecuteTxResponse.digest,
    options: { showObjectChanges: true }
  });
  if (shinamiResponse.objectChanges){
    for (var change in shinamiResponse.objectChanges) {
      const objChange: SuiObjectChange = shinamiResponse.objectChanges[change];
      if (objChange.type == "mutated" && objChange.objectId == OBJECT_TO_TRANSFER_ID) {
        console.log("Shinami node object version after waiting for transasction propagation: ", objChange.version);
      } 
    }
  }

    // 3. Poll the Mysten Full node until it has a record of the transaction.
    //    This will produce the correct, updated version number.
  const mystenResponse = await mystenClient.waitForTransaction({
    digest: sponsorSignAndExecuteTxResponse.digest,
    options: { showObjectChanges: true }
  });
  if (mystenResponse.objectChanges) {
    for (var change in mystenResponse.objectChanges) {
      const objChange: SuiObjectChange = mystenResponse.objectChanges[change];
      if (objChange.type == "mutated" && objChange.objectId == OBJECT_TO_TRANSFER_ID) {
        console.log(" Mysten node object version after waiting for transasction propagation: ", objChange.version);
      } 
    }
  }
}
