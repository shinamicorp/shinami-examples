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
  AccountAddress,
  APTOS_COIN
} from "@aptos-labs/ts-sdk";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { WalletSelector } from "@aptos-labs/wallet-adapter-ant-design";
import { Button } from 'antd';

import { useWallet as pontemUseWallet } from "@manahippo/aptos-wallet-adapter";

// Set up an Aptos client for submitting and fetching transactions
const aptosConfig = new AptosConfig({ network: Network.TESTNET });
const aptosClient = new Aptos(aptosConfig);

function App() {
  const {
    account,
    signTransaction
  } = useWallet();


  const {
    connect,
    disconnect,
    wallets,
    signAndSubmitTransaction
  } = pontemUseWallet();
  const wallet = 'PontemWallet';

  const renderWalletConnectorGroup = () => {
    return wallets.map((wallet) => {
      const option = wallet.adapter;
      return (
        <Button
          onClick={() => {
            connect(option.name);
          }}
          id={option.name.split(' ').join('_')}
          key={option.name}
          className="connect-btn">
          {option.name}
        </Button>
      );
    });
  };

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
      if (true) { // currentAccount
        // console.log("Connected wallet sender address: ", currentAccount);
        // const balance = await aptosClient.getAccountAPTAmount({ 
        //   accountAddress: AccountAddress.from(currentAccount)
        // });
        // console.log("account balance: ", balance);
        pendingTxResponse = // await connectedWalletTxBEBuildFESubmit(message, currentAccount);
                            await connectedWalletTxFEBuildFESubmit(message);
                            // await connectedWalletTxFEBuildFESubmitNonSponsored(message, currentAccount);
                            // await connectedWalletTxFEBuildBESubmit(message, currentAccount);
      }
      else {
        console.log("Invisible wallet sender address: 0x630af550649eeb3a027363c9ea46ec81e8a43b9a3ff5dfb34c60ef8a1199e934");
        const balance = await aptosClient.getAccountAPTAmount({ 
          accountAddress: AccountAddress.from("0x630af550649eeb3a027363c9ea46ec81e8a43b9a3ff5dfb34c60ef8a1199e934")
        });
        console.log("balance: ", balance);
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
    // const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
    // const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, true, FIVE_MINUTES_FROM_NOW_IN_SECONDS);


    const simpleTx = await aptosClient.transaction.build.simple({
      sender: senderAddress,
      withFeePayer: true,
      data: {
          // All transactions on Aptos are implemented via smart contracts.
          function: "0x1::aptos_account::transfer",
          functionArguments: ["0x630af550649eeb3a027363c9ea46ec81e8a43b9a3ff5dfb34c60ef8a1199e934", 100],
      },
  });

    // Step 5: Obtain the sender signature over the transaction 
    console.log("asking for sender sig");
    const senderSig = await signTransaction(simpleTx);
  

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

    // Step 4: Submit the transaction along with both signatures
    return await aptosClient.transaction.submit.simple({
      transaction: simpleTx,
      senderAuthenticator: senderSig,
      feePayerAuthenticator: sponsorSig
  });
}


const connectedWalletTxFEBuildBESubmit = async (message: string, senderAddress: string): Promise<PendingTransactionResponse> => {
  console.log("connectedWalletTxFEBuildBESubmit");
  // Step 1: build the transaction. Set a five min expiration to be safe since we'll wait on a user signature (SDK default = 20 seconds)
  const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
  const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, true, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

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

const connectedWalletTxFEBuildFESubmitNonSponsored = async (message: string): Promise<PendingTransactionResponse> => {
  console.log("connectedWalletTxFEBuildFESubmitNonSponsored");
  // Step 1: build the transaction. Set a five min expiration to be safe since we'll wait on a user signature (SDK default = 20 seconds)
  //const FIVE_MINUTES_FROM_NOW_IN_SECONDS = Math.floor(Date.now() / 1000) + (5 * 60);
  // const simpleTx = await buildSimpleMoveCallTransaction(AccountAddress.from(senderAddress), message, false, FIVE_MINUTES_FROM_NOW_IN_SECONDS);

  const transferTx = await aptosClient.transferCoinTransaction({
    sender: "0x782fad34c41f499d243cea3df3870c099d023ac81dc673574a87ad61635355a3",
    recipient: "0x630af550649eeb3a027363c9ea46ec81e8a43b9a3ff5dfb34c60ef8a1199e934",
    amount: 100
  });

  const transferTxPayload = {
    type: "entry_function_payload",
    function: "0x1::aptos_account::transfer_coins",
    type_arguments: [APTOS_COIN],
    arguments: ["0x630af550649eeb3a027363c9ea46ec81e8a43b9a3ff5dfb34c60ef8a1199e934", 100],
    mode: "write"
  }

  const submittedTx = await signAndSubmitTransaction(transferTxPayload);

  // Step 2: Obtain the sender signature over the transaction 
  const senderSig = await signTransaction(transferTx);

  // Step 3: Submit the transaction along with both signatures
  return await aptosClient.transaction.submit.simple({
    transaction: transferTx,
    senderAuthenticator: senderSig,
});
}

const buildSimpleMoveCallTransaction = async (sender: AccountAddress, message: string, hasFeePayer: boolean, expirationSeconds?: number): Promise<SimpleTransaction> => {
  const transaction = await aptosClient.transaction.build.simple({
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
      <div>{renderWalletConnectorGroup()}</div>
    </>
  );
};

export default App;
