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
  Hex
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
        pendingTxResponse = await connectedWalletTx(message, currentAccount);
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


  // 1. Ask the backend to build and sponsor a Move call transction with the given user input.
  // 2. Sign the sponsored transaction returned from the backend with the user's connected wallet.
  // 3. Submit the transaction and both signatures
  const connectedWalletTx = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
      const sponsorshipResp = await axios.post('/buildAndSponsorTx', {
        message,
        sender: senderAddress
      });

      const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.sponsorAuth).toUint8Array()));
      const transaction = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.transaction).toUint8Array()));

      const senderSig = await signTransaction(transaction);

      return await aptosClient.transaction.submit.simple({
        transaction: transaction,
        senderAuthenticator: senderSig,
        feePayerAuthenticator: sponsorSig,
    });
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
