import "./App.css";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { useState } from "react";
import axios from 'axios';
import { 
  PendingTransactionResponse, 
  AptosConfig, 
  Network, 
  Aptos, 
  UserTransactionResponse, 
  SimpleTransaction,
  Deserializer, 
  AccountAuthenticator,
  Hex,
  MoveString,
  AccountAddress
} from "@aptos-labs/ts-sdk";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";

// Set up an Aptos client for submitting and fetching transactions
const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptosClient = new Aptos(aptosConfig);

function App() {
  const {
    account,
    signTransaction
  } = useWallet();

  const currentAccount = account?.address;
  const [latestDigest, setLatestDigest] = useState<string>();
  const [latestResult, setLatestResult] = useState<string>();
  const [newSuccessfulResult, setnewSuccessfulResult] = useState<boolean>();
  

  // 1. Get the user's input and update the page state.
  // 2. Build, sponsor, and execute a Move call tranasction with the given user input. 
  //    If there is a connected wallet, represented by `currentAccount` having a value,
  //    then the connected wallet is the sender. Otherwise, the sender is a backend
  //    Shinami Invisible Wallet (hard coded for this very simple example app). 
  const executeTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setnewSuccessfulResult(false);
    const form = e.currentTarget
    const formElements = form.elements as typeof form.elements & {
      messageText: {value: string}
    };

    const message = formElements.messageText.value;

    let pendingTxResponse = undefined;
    try {
      if (currentAccount) {
        pendingTxResponse = await connectedWalletTxBEBuildFESubmit(message, currentAccount);
                            // await connectedWalletTxFEBuildFESubmit(message, currentAccount);
                            // await connectedWalletTxFEBuildBESubmit(message, currentAccount);
      }
      else {
        pendingTxResponse = await invisibleWalletTx(message);
      }

      if(pendingTxResponse?.hash) {
          waitForTxAndUpdateResult(pendingTxResponse.hash);
      } else {
          console.log("Unable to find a digest returned from the backend.");
      }  
  } catch (e) {
    console.log("error: ",e);
  }
  }


  // Poll the Full node represented by the SuiClient until the given digest
  // has been checkpointed and propagated to the node, and the node returns 
  // results for the digest. On the response, update the page accordingly.
  const waitForTxAndUpdateResult = async (txHash: string) => {
      const executedTransaction = await aptosClient.waitForTransaction({
        transactionHash: txHash
      }) as UserTransactionResponse;

    if (executedTransaction.success){
      for (var element in executedTransaction.events) {
        if (executedTransaction.events[element].type == "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::MessageChange") {
          setLatestResult(executedTransaction.events[element].data.to_message);
        }
      }
        setLatestDigest(txHash);
        setnewSuccessfulResult(true);

    } else {
      console.log("Transaction did not execute successfully.");
    }
  }


  const connectedWalletTxBEBuildFESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
    // Step 1: Request a transaction and sponsorship from the BE
    console.log("connectedWalletTxBEBuildFESubmit");
    const sponsorshipResp = await axios.post('/buildAndSponsorTx', {
      message,
      sender: senderAddress
    });

    // Step 2: Deserialize the sponsor signature (an AccountAuthenticator) and transaction (a SimpleTransaction)
    const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.sponsorAuthenticator).toUint8Array()));
    const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.simpleTx).toUint8Array()));

    // Step 3: Obtain the sender signature over the transaction 
    const senderSig = await signTransaction(simpleTx);

    // Step 4: Submit the transaction along with both signatures
    return await aptosClient.transaction.submit.simple({
      transaction: simpleTx,
      senderAuthenticator: senderSig,
      feePayerAuthenticator: sponsorSig,
    });
  }


  const connectedWalletTxFEBuildFESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
    console.log("connectedWalletTxFEBuildFESubmit");
    // Step 1: build the transaction. Set a five min expiration to be safe since we'll wait on a user signature (SDK default = 20 seconds)
    const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
    const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

    // Step 2: Request a BE sponsorship
    const sponsorshipResp = await axios.post('/sponsorTx', {
      transaction: simpleTx.bcsToHex().toString() 
    });

    // Step 3: Deserialize the sponsor signature (an AccountAuthenticator) and feePayerAddress (an AccountAddress)
    const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.sponsorAuthenticator).toUint8Array()));
    const feePayerAddress = AccountAddress.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.feePayerAddress).toUint8Array()));

    // Step 4: Update the transaction's feePayerAddress with what we got from the BE 
    //         (this could technically come after signing but before submitting)
    simpleTx.feePayerAddress = feePayerAddress;

    // Step 5: Obtain the sender signature over the transaction 
    const senderSig = await signTransaction(simpleTx);

    // Step 4: Submit the transaction along with both signatures
    return await aptosClient.transaction.submit.simple({
      transaction: simpleTx,
      senderAuthenticator: senderSig,
      feePayerAuthenticator: sponsorSig,
  });
}


const connectedWalletTxFEBuildBESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
  console.log("connectedWalletTxFEBuildBESubmit");
  // Step 1: build the transaction. Set a five min expiration to be safe since we'll wait on a user signature (SDK default = 20 seconds)
  const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
  const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

  // Step 2: Obtain the sender signature over the transaction 
  const senderSig = await signTransaction(simpleTx);

  // Step 3: Request that the BE sponsor and submit the transaction.
  //         Pass the serialized SimpleTransaction and sender AccountAuthenticator
  const sponsorshipResp = await axios.post('/sponsorAndSubmitTx', {
    transaction: simpleTx.bcsToHex().toString(),
    senderAuth: senderSig.bcsToHex().toString()
  });

  return sponsorshipResp.data.pendingTx;
}

const buildSimpleMoveCallTransaction = async (sender: AccountAddress, message: string, expirationSeconds?: number): Promise<SimpleTransaction> => {
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


  // Ask the backend to build, sponsor, sign, and execute a Move call transaction with the 
  // given user input. The sender is the user's Invisible Wallet, which in this example app
  // is just a hard-coded wallet for simplicity.
  const invisibleWalletTx = async (message: string): Promise<PendingTransactionResponse> => {
      const resp = await axios.post('/invisibleWalletTx', {
        message,
        userId: "abc123"
      });
      return resp.data;
}



  return (
    <>
          <h1>Shinami Sponsored Transactions with @aptos-labs/wallet-adapter-react</h1>
          <h3>Set a short message</h3>
        <form onSubmit={executeTransaction}>
          <div>
            <label htmlFor="messageText">Message:</label>
            <input type="text" name="messageText" id="messageText" required />
          </div>
          <button type="submit">Make move call</button>
        </form>
        <h3>Transaction result:</h3>
        {newSuccessfulResult ?
          <label>Latest Succesful Digest: {latestDigest} Message Set To:  {latestResult} </label>
          :
          <label>Latest Successful Digest: N/A</label>
        }
      <h3>Connect a wallet to be the sender. Otherwise use a backend Shinami Invisible Wallet.</h3>
      <label>Sender = {currentAccount ? "connected wallet address: " + currentAccount : "backend Shinami Invisible Wallet"} </label>
      <WalletSelector />
    </>
  );
};

export default App;
