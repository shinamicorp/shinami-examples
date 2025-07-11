import "./App.css";
import "./index.css";
import { useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignTransaction,
  useSuiClient
} from "@mysten/dapp-kit";
import { Box, Heading } from "@radix-ui/themes";
import axios from 'axios';
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import {
  buildGaslessTransaction,
  GaslessTransaction
} from "@shinami/clients/sui";
const EXAMPLE_MOVE_PACKAGE_ID = import.meta.env.VITE_EXAMPLE_MOVE_PACKAGE_ID;


function App() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const suiClient = useSuiClient();
  const [latestDigest, setLatestDigest] = useState<string>();
  const [latestResult, setLatestResult] = useState<string>();
  const [firstInt, setFirstInt] = useState<string>();
  const [secondInt, setsecondInt] = useState<string>();
  const [newSuccessfulResult, setnewSuccessfulResult] = useState<boolean>();


  type AddCallEvent = {
    result: string;
  };

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
      integerOne: { value: number },
      integerTwo: { value: number }
    };

    const x = formElements.integerOne.value;
    const y = formElements.integerTwo.value;
    setFirstInt(x.toString());
    setsecondInt(y.toString());

    let suiTxResponse = undefined;
    try {
      if (currentAccount) {
        suiTxResponse = await
          connectedWalletTxBEBuildBESubmit(x, y, currentAccount.address);
        // connectedWalletTxBEBuildFESubmit(x, y, currentAccount.address);
        // connectedWalletTxFEBuildFESubmit(x, y, currentAccount.address);
      }
      else {
        suiTxResponse = await invisibleWalletTx(x, y);
      }

      if (suiTxResponse.digest) {
        waitForTxAndUpdateResult(suiTxResponse.digest);
      } else {
        console.log("Unable to find a digest returned from the backend.");
      }
    } catch (e) {
      console.log(e);
    }
  }


  // Poll the Full node represented by the SuiClient until the given digest
  // has been checkpointed and propagated to the node, and the node returns 
  // results for the digest. On the response, update the page accordingly.
  const waitForTxAndUpdateResult = async (digest: string) => {
    const finalResult = await suiClient.waitForTransaction({
      digest: digest,
      options: {
        showEffects: true,
        showEvents: true
      }
    });

    if (finalResult.effects && finalResult.events && finalResult.effects.status.status == "success") {
      const resultObj = finalResult.events[0].parsedJson as AddCallEvent;
      const result = resultObj.result;
      setLatestDigest(digest);
      setLatestResult(result);
      setnewSuccessfulResult(true);
    } else {
      console.log("Transaction did not execute successfully.");
    }
  }


  // 1. Ask the backend to build and sponsor a Move call transction with the given user input.
  // 2. Sign the sponsored transaction returned from the backend with the user's connected wallet.
  // 3. Ask the backend to execute the signed transaction.
  // 4. Return the SuiTransactionBlockResponse to the caller.
  const connectedWalletTxBEBuildBESubmit = async (x: number, y: number, senderAddress: string): Promise<SuiTransactionBlockResponse> => {
    console.log("connectedWalletTxBEBuildBESubmit");
    const sponsorshipResp = await axios.post('/buildSponsoredtx', {
      x: x,
      y: y,
      sender: senderAddress
    });

    const { signature } = await signTransaction({
      transaction: sponsorshipResp.data.txBytes
    });

    const resp = await axios.post('/executeSponsoredTx', {
      tx: sponsorshipResp.data.txBytes,
      sponsorSig: sponsorshipResp.data.sponsorSig,
      senderSig: signature
    });
    return resp.data;
  }

  // 1. Ask the backend to build and sponsor a Move call transction with the given user input.
  // 2. Sign the sponsored transaction returned from the backend with the user's connected wallet.
  // 3. Submit the transaction to Fullnode for execution from the frontend.
  // 4. Return the SuiTransactionBlockResponse to the caller.
  const connectedWalletTxBEBuildFESubmit = async (x: number, y: number, senderAddress: string): Promise<SuiTransactionBlockResponse> => {
    console.log("connectedWalletTxBEBuildFESubmit");
    const sponsorshipResp = await axios.post('/buildSponsoredtx', {
      x: x,
      y: y,
      sender: senderAddress
    });

    const { signature } = await signTransaction({
      transaction: sponsorshipResp.data.txBytes
    });

    const resp = await suiClient.executeTransactionBlock({
      transactionBlock: sponsorshipResp.data.txBytes,
      signature: [sponsorshipResp.data.sponsorSig, signature]
    })
    return resp;
  }

  // 1. Build a Move call transaction with the given user input.
  // 2. Ask the backend to sponsor it
  // 3. Sign the sponsored transaction returned from the backend with the user's connected wallet.
  // 4. Submit the transaction to a Fullnode from the frontend.
  // 4. Return the SuiTransactionBlockResponse to the caller.
  const connectedWalletTxFEBuildFESubmit = async (x: number, y: number, senderAddress: string): Promise<SuiTransactionBlockResponse> => {
    console.log("connectedWalletTXFEBuildFESubmit");

    const gaslessTx = await buildGasslessMoveCall(x, y);
    gaslessTx.sender = senderAddress;

    const sponsorshipResp = await axios.post('/sponsorTx', {
      gaslessTx
    });

    const { signature } = await signTransaction({
      transaction: sponsorshipResp.data.txBytes
    });

    const resp = await suiClient.executeTransactionBlock({
      transactionBlock: sponsorshipResp.data.txBytes,
      signature: [sponsorshipResp.data.sponsorSig, signature]
    })
    return resp;
  }



  // 1. Ask the backend to build, sponsor, sign, and execute a Move call transaction with the 
  //    given user input. The sender is the user's Invisible Wallet, which in this example app
  //    is just a hard-coded wallet for simplicity.
  // 2. Return the SuiTransactionBlockResponse to the caller.
  const invisibleWalletTx = async (x: number, y: number): Promise<SuiTransactionBlockResponse> => {
    console.log("invisibleWalletTx");
    const resp = await axios.post('/invisibleWalletTx', {
      x: x,
      y: y,
      userId: "abc123"
    });

    return resp.data;
  }



  // 1. Build a GaslessTransaction representing a Move call using Shinami's 
  //   buildGaslessTransaction helper function (which calls Transaction.build())
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
        sui: suiClient
      }
    );
  }



  return (
    <>
      <Box>
        <Heading>Shinami Gas Station + dApp Kit</Heading>
      </Box>
      <Box>
        <h3>Pick two positive integers to add together in a Move call</h3>
        <form onSubmit={executeTransaction}>
          <div>
            <label htmlFor="integerOne">First integer:</label>
            <input type="number" name="integerOne" id="integerOne" required />
          </div>
          <div>
            <label htmlFor="integerTwo">Second integer:</label>
            <input type="number" name="integerTwo" id="integerTwo" required />
          </div>
          <button type="submit">Make move call</button>
        </form>
      </Box>
      <Box>
        <h3>Transaction result:</h3>
        {newSuccessfulResult ?
          <label>{firstInt} + {secondInt} =  {latestResult} Digest: {latestDigest}</label>
          :
          <label>N/A</label>
        }
      </Box>
      <Box>
        <h3>Connect a wallet. Otherwise use a backend Shinami Invisible Wallet.</h3>
        <label>Sender = {currentAccount ? "connected wallet address: " + currentAccount.address : "backend Shinami Invisible Wallet"} </label>
      </Box>
      <Box>
        <ConnectButton />
      </Box>
    </>
  );
};

export default App;
