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

function App() {
  const currentAccount = useCurrentAccount();
  const { mutateAsync: signTransaction } = useSignTransaction();
  const client = useSuiClient();
  const [latestDigest, setLatestDigest] = useState<string>();
  const [latestResult, setLatestResult] = useState<string>();
  const [firstInt, setFirstInt] = useState<string>();
  const [secondInt, setsecondInt] = useState<string>();
  const [newSuccessfulResult, setnewSuccessfulResult] = useState<boolean>();
  
  type AddCallEvent = {
    result: string;
  };

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
          console.log("Transaction did not execute successfully.");
      }  
  } catch (e) {
    console.log(e);
  }
  }

  const waitForTxAndUpdateResult = async (digest: string) => {
    const finalResult = await client.waitForTransaction({ 
      digest: digest,
      options: {
        showEffects: true,
        showEvents: true
      }
    });

    if (finalResult.effects && finalResult.effects.status.status == "success"){
      if (finalResult.events){
        const resultObj = finalResult.events[0].parsedJson as AddCallEvent;
        const result = resultObj.result;
        setLatestDigest(digest);
        setLatestResult(result);
        setnewSuccessfulResult(true);
      }
    } else {
      console.log("Transaction did not execute successfully.");
    }
  }


  const connectedWalletTx = async (x: number, y: number, senderAddress: string): Promise<SuiTransactionBlockResponse> => {
      const sponsorshipResp = await axios.post('/buildSponsoredtx', {
        x: x,
        y: y,
        sender: senderAddress
      });

      // const txb = Transaction.from(sponsorshipResp.data.txBytes);
      const { signature } = await signTransaction({
        transaction: sponsorshipResp.data.txBytes
      });
      
      return await client.executeTransactionBlock({
            transactionBlock: sponsorshipResp.data.txBytes,
            signature: [signature, sponsorshipResp.data.signature]
      });
  }


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
        <h3>Connect your wallet for a connected wallet transaction:</h3>
        <ConnectButton />
        <label>Connected wallet address: {currentAccount ? currentAccount.address : "No wallet connected"} </label>
        </Box>
      </Flex>
    </>
  );
};

export default App;