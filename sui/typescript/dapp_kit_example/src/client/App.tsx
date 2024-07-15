import "./App.css";
import { useState } from "react";
import { 
  ConnectButton, 
  useCurrentAccount,
  useSignTransaction,
  useSuiClient
} from "@mysten/dapp-kit";
import { Box, Flex, Heading } from "@radix-ui/themes";
import axios from 'axios';
import { SuiTransactionBlockResponse } from "@mysten/sui/client";
import { useShinamiClient }  from "./hooks/useShinamiClient.js";

function App() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const client = useSuiClient();
  const shinamiClient = useShinamiClient(); // My limited but functional replacement for dapp-kit client component and hook
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
      integerOne: {value: number},
      integerTwo: {value: number}
    };

    const x = formElements.integerOne.value;
    const y = formElements.integerTwo.value;
    setFirstInt(x.toString());
    setsecondInt(y.toString());

    let suiTxResponse = undefined;
    try {
      if (currentAccount) {
        suiTxResponse = await connectedWalletTx(x, y, currentAccount.address);
      }
      else {
        suiTxResponse = await invisibleWalletTx(x, y);
      }

      if(suiTxResponse.digest) {
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
    const finalResult = await shinamiClient.waitForTransaction({ 
      digest: digest,
      options: {
        showEffects: true,
        showEvents: true
      }
    });

    if (finalResult.effects && finalResult.events && finalResult.effects.status.status == "success"){
        console.log(finalResult.events);
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
  const connectedWalletTx = async (x: number, y: number, senderAddress: string): Promise<SuiTransactionBlockResponse> => {
      const sponsorshipResp = await axios.post('/buildSponsoredtx', {
        x: x,
        y: y,
        sender: senderAddress
      });

      const { signature } = await signTransaction({
        transaction: sponsorshipResp.data.txBytes
      });

      const resp =  await axios.post('/executeSponsoredTx', {
        tx: sponsorshipResp.data.txBytes,
        sponsorSig: sponsorshipResp.data.signature,
        senderSig: signature
      });
      return resp.data;
  }


  // Ask the backend to build, sponsor, sign, and execute a Move call transaction with the 
  // given user input. The sender is the user's Invisible Wallet, which in this example app
  // is just a hard-coded wallet for simplicity.
  const invisibleWalletTx = async (x: number, y: number): Promise<SuiTransactionBlockResponse> => {
      const resp = await axios.post('/invisibleWalletTx', {
        x: x,
        y: y,
        userId: "abc123"
      });
      return resp.data;
}



  return (
    <>
          <Flex
        position="sticky"
        px="4"
        py="2"
        justify="between"
      >
        <Box>
          <Heading>Shinami Sponsored Transactions with dApp Kit</Heading>
        </Box>
        <Box>
          <h3>Pick two integers to add in a Move call</h3>
        <form onSubmit={executeTransaction}>
          <div>
            <label htmlFor="integerOne">First integer:</label>
            <input type="text" name="integerOne" id="integerOne" required />
          </div>
          <div>
            <label htmlFor="integerTwo">Second integer:</label>
            <input type="text" name="integerTwo" id="integerTwo" required />
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
      <h3>Connect a wallet to be the sender. Otherwise use a backend Shinami Invisible Wallet.</h3>
      <label>Sender = {currentAccount ? "connected wallet address: " + currentAccount.address : "backend Shinami Invisible Wallet"} </label>
      </Box>
      <ConnectButton />
      </Flex>
    </>
  );
};

export default App;
