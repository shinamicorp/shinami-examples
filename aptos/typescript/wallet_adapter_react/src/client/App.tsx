import "./App.css";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { useState } from "react";
import axios from 'axios';
import {
  PendingTransactionResponse,
  UserTransactionResponse,
  SimpleTransaction,
  Deserializer,
  AccountAuthenticator,
  Hex,
  MoveString,
  AccountAddress
} from "@aptos-labs/ts-sdk";
import { createAptosClient } from "@shinami/clients/aptos";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";

const SHINAMI_APTOS_REST_API_KEY = import.meta.env.VITE_SHINAMI_PUBLIC_APTOS_TESTNET_NODE_API_KEY;
if (!(SHINAMI_APTOS_REST_API_KEY)) {
  throw Error('VITE_SHINAMI_PUBLIC_APTOS_TESTNET_NODE_API_KEY .env.local variable not set');
}

// Set up an Aptos client for building, submitting, and fetching transactions
const aptosClient = createAptosClient(SHINAMI_APTOS_REST_API_KEY);

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
  // 2. Build, sponsor, and execute a feePayer SimpleTransaction with the given user input. 
  //    If there is a connected wallet, represented by `currentAccount` having a value,
  //    then the connected wallet is the sender. Otherwise, the sender is a backend
  //    Shinami Invisible Wallet (hard coded for this very simple example app). 
  const executeTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setnewSuccessfulResult(false);
    const form = e.currentTarget
    const formElements = form.elements as typeof form.elements & {
      messageText: { value: string }
    };

    const message = formElements.messageText.value;

    let pendingTxResponse = undefined;
    try {
      if (currentAccount) {
        pendingTxResponse =
          await connectedWalletTxFEBuildBESubmit(message, currentAccount);
        // await connectedWalletTxBEBuildFESubmit(message, currentAccount);
        // await connectedWalletTxBEBuildBESubmit(message, currentAccount);
        // await connectedWalletTxFEBuildFESubmit(message, currentAccount);
      } else {
        pendingTxResponse = await invisibleWalletTx(message);
      }

      if (pendingTxResponse?.hash) {
        waitForTxAndUpdateResult(pendingTxResponse.hash);
      } else {
        console.log("Unable to find a digest returned from the backend.");
      }
    } catch (e) {
      console.log("error: ", e);
    }
  }


  // Poll the Full node represented by the Aptos client until the given digest
  // has been propagated to the node, and the node returns results for the digest.
  // Upon the response, update the page accordingly.
  const waitForTxAndUpdateResult = async (txHash: string) => {
    console.log("transaction: ", txHash);
    const executedTransaction = await aptosClient.waitForTransaction({
      transactionHash: txHash
    }) as UserTransactionResponse;

    if (executedTransaction.success) {
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


  // 1. Ask the BE to build and sponsor a feePayer SimpleTransaction
  // 2. Obtain the sender signature over the transaction returned from the BE
  // 3. Submit the transaction, along with the sender and sponsor (feePayer) signatures. 
  //     Return the PendingTransactionResponse to the caller
  const connectedWalletTxBEBuildFESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
    // Step 1: Request a transaction and sponsorship from the BE
    console.log("connectedWalletTxBEBuildFESubmit");
    const sponsorshipResp = await axios.post('/buildAndSponsorTx', {
      message,
      sender: senderAddress
    });

    // Step 2: Obtain the sender signature over the transaction after deserializing it
    const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.simpleTx).toUint8Array()));
    const senderSig = await signTransaction(simpleTx);

    // Step 3: Submit the transaction along with both signatures and return the response to the caller
    const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.sponsorAuthenticator).toUint8Array()));
    return await aptosClient.transaction.submit.simple({
      transaction: simpleTx,
      senderAuthenticator: senderSig,
      feePayerAuthenticator: sponsorSig,
    });
  }


  // 1. Ask the BE to build and sponsor a SimpleTransaction
  // 2. Obtain the sender signature over the transaction returned from the BE
  // 3. Ask the BE to submit the transaction, along with the sender and sponsor (feePayer) signatures.
  //    Return the PendingTransactionResponse to the caller.
  const connectedWalletTxBEBuildBESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
    console.log("connectedWalletTxBEBuildBESubmit");

    // Step 1: Request a transaction and sponsorship from the BE
    const sponsorshipResp = await axios.post('/buildAndSponsorTx', {
      message,
      sender: senderAddress
    });

    // Step 2: Obtain the sender signature over the transaction after deserializing it
    const simpleTx = SimpleTransaction.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.simpleTx).toUint8Array()));
    const senderSig = await signTransaction(simpleTx);

    // Step 3: Ask the backend to submit the transaction along with the signatures
    //         and return the response to the caller.
    const txSubmission = await axios.post('/submitSponsoredTx', {
      transaction: sponsorshipResp.data.simpleTx,
      sponsorAuth: sponsorshipResp.data.sponsorAuthenticator,
      senderAuth: senderSig.bcsToHex().toString()
    });

    return txSubmission.data.pendingTx;
  }



  // 1. Build a feePayer SimpleTransaction
  // 2. Obtain the sender signature over the transaction (with the special `0x0` feePayer address)
  // 3. Ask the BE to sponsor the transaction
  // 4. Update the transaction's feePayer address
  // 5. Submit the transaction and associated signatures. Return the PendingTransactionResponse to the caller
  const connectedWalletTxFEBuildFESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
    console.log("connectedWalletTxFEBuildFESubmit");
    // Step 1: build the transaction. Set a five min expiration to be safe since we'll wait on a user signature (SDK default = 20 seconds)
    const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
    const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, true, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

    // Step 2: Obtain the sender signature over the transaction 
    const senderSig = await signTransaction(simpleTx);

    // Step 3: Request a BE sponsorship
    const sponsorshipResp = await axios.post('/sponsorTx', {
      transaction: simpleTx.bcsToHex().toString()
    });

    // Step 4: Update the transaction's feePayerAddress returned from the BE (after deserializing it)
    //         (this could technically come after signing but before submitting)
    const feePayerAddress = AccountAddress.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.feePayerAddress).toUint8Array()));
    simpleTx.feePayerAddress = feePayerAddress;

    // Step 5: Submit the transaction along with both signatures (after deserializing the feePayer signature returned from the BE)
    //         and return the response to the caller.
    const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(sponsorshipResp.data.sponsorAuthenticator).toUint8Array()));
    return await aptosClient.transaction.submit.simple({
      transaction: simpleTx,
      senderAuthenticator: senderSig,
      feePayerAuthenticator: sponsorSig
    });
  }



  // 1. Build a feePayer SimpleTransaction
  // 2. Obtain the sender signature over the transaction (with the special `0x0` feePayer address)
  // 3. Ask the BE to sponsor and submit the transaction (along with the sender auth)
  //    Return the PendingTransactionResponse to the caller
  const connectedWalletTxFEBuildBESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
    console.log("connectedWalletTxFEBuildBESubmit");
    // Step 1: Build a feePayer SimpleTransaction. Set a five min expiration to be safe 
    //         since we'll wait on a user signature (SDK default = 20 seconds)
    const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
    const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, true, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

    // Step 2: Obtain the sender signature over the transaction 
    const senderSig = await signTransaction(simpleTx);

    // Step 3: Request that the BE sponsor and submit the transaction and return the 
    //          PendingTransactionResponse in the response to the caller
    const sponsorSubmitResp = await axios.post('/sponsorAndSubmitTx', {
      transaction: simpleTx.bcsToHex().toString(),
      senderAuth: senderSig.bcsToHex().toString()
    });
    return sponsorSubmitResp.data.pendingTx;
  }



  // Build a SimpleTransaction representing a Move call to a module we deployed to Testnet
  // https://explorer.aptoslabs.com/account/0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817/modules/code/message?network=testnet
  const buildSimpleMoveCallTransaction = async (sender: AccountAddress, message: string, hasFeePayer: boolean, expirationSeconds?: number): Promise<SimpleTransaction> => {
    return await aptosClient.transaction.build.simple({
      sender: sender,
      withFeePayer: hasFeePayer,
      data: {
        function: "0xc13c3641ba3fc36e6a62f56e5a4b8a1f651dc5d9dc280bd349d5e4d0266d0817::message::set_message",
        functionArguments: [new MoveString(message)]
      },
      options: {
        expireTimestamp: expirationSeconds
      }
    });
  }



  // 1. Ask the backend to build, sign, sponsor, and execute a SimpleTransaction with the given user input. 
  //    The sender is the user's Invisible Wallet, which in this example app is just a hard-coded wallet for simplicity.
  //     Return the PendingTransactionResponse to the caller.
  const invisibleWalletTx = async (message: string): Promise<PendingTransactionResponse> => {
    console.log("invisibleWalletTx");
    const resp = await axios.post('/invisibleWalletTx', {
      message
    });
    return resp.data.pendingTx;
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
