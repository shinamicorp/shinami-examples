'use client';
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState } from 'react';
import {
  AccountAddress,
  AccountAuthenticator,
  Aptos,
  AptosConfig,
  Deserializer,
  Hex,
  Network,
  PendingTransactionResponse,
  UserTransactionResponse
} from "@aptos-labs/ts-sdk";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { buildSimpleMoveCallTransaction, MODULE_ADDRESS } from "./lib/utils";


export default function Home() {
  const {
    account,
    signTransaction
  } = useWallet();

  const currentAccount = account?.address;
  const [latestDigest, setLatestDigest] = useState<string>();
  const [latestResult, setLatestResult] = useState<string>();
  const [newSuccessfulResult, setnewSuccessfulResult] = useState<boolean>();

  // Set up an Movement client for building, submitting, and fetching transactions
  const config = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://testnet.movementnetwork.xyz/v1',
    faucet: 'https://faucet.testnet.movementnetwork.xyz/',
  });
  const movementClient = new Aptos(config);

  // 1. Get the user's input and update the page state.
  // 2. Build, sponsor, and execute a feePayer SimpleTransaction with the given user input. 
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
          // await connectedWalletTxFEBuildBESubmit(message, currentAccount.toString());
          await connectedWalletTxFEBuildFESubmit(message, currentAccount.toString());
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

  // Poll the Full node represented by the Movement client until the given digest
  // has been propagated to the node, and the node returns results for the digest.
  // Upon the response, update the page accordingly.
  const waitForTxAndUpdateResult = async (txHash: string) => {
    console.log("transaction: ", txHash);
    const executedTransaction = await movementClient.waitForTransaction({
      transactionHash: txHash
    }) as UserTransactionResponse;

    if (executedTransaction.success) {
      for (var element in executedTransaction.events) {
        if (executedTransaction.events[element].type == `${MODULE_ADDRESS}::message::MessageChangeEvent`) {
          setLatestResult(`Message changed from: "${executedTransaction.events[element].data.from_message}" to: "${executedTransaction.events[element].data.to_message}"`);
        }
      }
      setLatestDigest(txHash);
      setnewSuccessfulResult(true);
    } else {
      console.log("Transaction did not execute successfully.");
    }
  }

  // 1. Build a feePayer SimpleTransaction
  // 2. Obtain the sender signature over the transaction (with the special `0x0` feePayer address)
  // 3. Ask the BE to sponsor and submit the transaction and return the PendingTransactionResponse to the caller
  const connectedWalletTxFEBuildBESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse | undefined> => {
    console.log("connectedWalletTxFEBuildBESubmit");
    // Step 1: Build a feePayer SimpleTransaction. Set a five min expiration to be safe 
    //         since we'll wait on a user signature (SDK default = 20 seconds)
    const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
    const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, true, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

    // Step 2: Obtain the sender signature over the transaction 
    const senderSig = await signTransaction({ transactionOrPayload: simpleTx });

    // Step 3: Request that the BE sponsor and submit the transaction and return the 
    //  PendingTransactionResponse in the response to the caller
    const resp = await fetch("/api/sponsor-and-submit-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txSerialized: simpleTx.bcsToHex().toString(),
        rawTxSerialized: simpleTx.rawTransaction.bcsToHex().toString(),
        senderSigSerialized: senderSig.authenticator.bcsToHex().toString()
      }),
    });
    const result = await resp.json();

    return result;
  }

  // 1. Build a feePayer SimpleTransaction
  // 2. Obtain the sender signature over the transaction (with the special `0x0` feePayer address)
  // 3. Ask the BE to sponsor the transaction
  // 4. Update the transaction's feePayer address with the actual address returned from the BE
  // 5. Submit the transaction and associated signatures. Return the PendingTransactionResponse to the caller
  const connectedWalletTxFEBuildFESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse | undefined> => {
    console.log("connectedWalletTxFEBuildFESubmit");
    // Step 1: build the transaction. Set a five min expiration to be safe since we'll wait on a user signature (SDK default = 20 seconds)
    const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
    const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, true, FIVE_MINUTES_FROM_NOW_IN_SECONDS);
    console.log("placeholder feePayer address:", simpleTx.feePayerAddress?.toString());

    // Step 2: Obtain the sender signature over the transaction (can come before or after sponsorship, but if you wait until after
    //  and the user fails to sign, you'll still end up paying the small sponsorship fee for an unused sponsorship).
    const senderSig = await signTransaction({ transactionOrPayload: simpleTx });

    // Step 3: Request a BE sponsorship
    const sponsorshipResp = await fetch("/api/sponsor-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        txSerialized: simpleTx.bcsToHex().toString()
      }),
    });
    const result = await sponsorshipResp.json();

    // Step 4: Update the transaction's feePayerAddress returned from the BE (after deserializing it)
    const feePayerAddress = AccountAddress.deserialize(new Deserializer(Hex.fromHexString(result.feePayerAddress).toUint8Array()));
    simpleTx.feePayerAddress = feePayerAddress;
    console.log("actual feePayer address (which was just set on the transaction before submitting it):", simpleTx.feePayerAddress.toString());

    // Step 5: Submit the transaction along with both signatures (after deserializing the feePayer signature returned from the BE)
    //         and return the response to the caller.
    const sponsorSig = AccountAuthenticator.deserialize(new Deserializer(Hex.fromHexString(result.sponsorAuthenticator).toUint8Array()));
    const pendingTx = await movementClient.transaction.submit.simple({
      transaction: simpleTx,
      senderAuthenticator: senderSig.authenticator,
      feePayerAuthenticator: sponsorSig
    });

    return pendingTx;
  }


  // 1. Ask the backend to build, sign, sponsor, and execute a SimpleTransaction with the given user input. 
  //    The sender is the user's Invisible Wallet, which in this example app is just a hard-coded wallet for simplicity.
  //     Return the PendingTransactionResponse to the caller.
  const invisibleWalletTx = async (message: string): Promise<PendingTransactionResponse> => {
    console.log("invisibleWalletTx");
    const sponsoredInvisibleWalletTxResp = await fetch("/api/invisible-wallet-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message
      }),
    });
    const result = await sponsoredInvisibleWalletTxResp.json();
    console.log("result");
    return result;
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen -full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <h1>Shinami Sponsored Transactions on Movement</h1>
        <form onSubmit={executeTransaction}>
          <div>
            <label htmlFor="messageText">Set a short message:</label>
            <input type="text" name="messageText" id="messageText" required className="border-2 border-indigo-600" />
          </div>
          <br />
          <button type="submit" className="border-2 border-indigo-600">Click here to make a Move call</button>
        </form>
        <h3>Transaction result:</h3>
        {newSuccessfulResult ?
          <p>
            <label>Latest Succesful Digest: {latestDigest} Message Set To:  {latestResult} </label>
            <br />
            <a href={`https://explorer.movementnetwork.xyz/txn/${latestDigest}?network=bardock+testnet`} target="_blank">[View on Movement Explorer]</a>
          </p>
          :
          <label>Latest Successful Digest: N/A</label>
        }
        <WalletSelector />
      </main>
    </div>
  );
}
