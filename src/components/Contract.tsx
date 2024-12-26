import { useEffect, useMemo, useState } from "react";
import { useBalance, useDisconnect, useWallet } from "@fuels/react";

import LocalFaucet from "./LocalFaucet";
import { TestContract } from "../sway-api";
import Button from "./Button";
import { isLocal, contractId } from "../lib.tsx";
import { useNotification } from "../hooks/useNotification.tsx";
import {
  bn,
  BN,
  createAssetId,
  hexlify,
  WalletUnlocked,
  ZeroBytes32,
} from "fuels";
import { useTxTimer } from "../hooks/useTxTimer.ts";
import { toast } from "react-toastify";
import { usePrepareContractCall } from "../hooks/usePrepareContractCall.ts";
import { awaitTransactionStatus } from "../utils.ts";

export default function Contract() {
  const { disconnect } = useDisconnect();

  const {
    errorNotification,
    transactionSubmitNotification,
    transactionSuccessNotification,
  } = useNotification();
  const [contract, setContract] = useState<TestContract>();
  const [isLoading, setIsLoading] = useState(false);

  const [tokenSymbol, setTokenSymbol] = useState<string>();
  const [tokenBalance, setTokenBalance] = useState<BN>();
  const [tokenDecimals, setTokenDecimals] = useState<number>();

  const { wallet, refetch } = useWallet();

  // const { balance: walletETHBalance } = useBalance({
  //   address: wallet?.address.toB256(),
  // });
  const walletETHBalance = bn.parseUnits("0", 18);

  const { startTimer, stopTimer, timerDuration } = useTxTimer();
  const {
    startTimer: startTimer2,
    stopTimer: stopTimer2,
    timerDuration: timerDuration2,
  } = useTxTimer();

  const [isLoading2, setIsLoading2] = useState(false);

  const mintFn = useMemo(() => {
    if (!contract || !wallet || !tokenDecimals) return undefined;
    return contract.functions.mint(
      {
        Address: {
          bits: wallet.address.toB256(),
        },
      },
      ZeroBytes32,
      bn.parseUnits("5", tokenDecimals)
    );
  }, [contract, wallet, tokenDecimals]);

  const { preparedTxReq, reprepareTxReq } = usePrepareContractCall(mintFn);

  useEffect(() => {
    (async () => {
      if (wallet && !contract) {
        const testContract = new TestContract(contractId, wallet);

        const { value: tokenSymbol } = await testContract.functions
          .symbol(createAssetId(contractId, ZeroBytes32))
          .get();
        setTokenSymbol(tokenSymbol);

        const { value: tokenDecimals } = await testContract.functions
          .decimals(createAssetId(contractId, ZeroBytes32))
          .get();
        setTokenDecimals(tokenDecimals);

        const balance = await wallet.getBalance(
          createAssetId(contractId, ZeroBytes32).bits
        );
        setTokenBalance(balance);

        setContract(testContract);
      }
    })();
  }, [wallet, contract]);

  useEffect(() => {
    console.log({
      preparedTxReq,
    });
  }, [preparedTxReq]);

  const mintTokens = async () => {
    try {
      setIsLoading(true);

      if (!wallet || !contract) {
        return;
      }

      startTimer();

      if (!preparedTxReq) {
        toast.error("Error preparing transaction");
        return;
      }

      console.log();

      const signedTransaction = await (
        wallet["_connector"]["_currentConnector"].burnerWallet as WalletUnlocked
      ).signTransaction(preparedTxReq);

      preparedTxReq.updateWitnessByOwner(wallet.address, signedTransaction);

      const encodedTx = hexlify(preparedTxReq.toTransactionBytes());

      transactionSubmitNotification("Minting 5 $DHAI");

      const mintTx = await awaitTransactionStatus(
        "https://testnet.fuel.network/v1/graphql-sub",
        encodedTx,
        fetch
      );

      console.log(mintTx);

      // await mintTx.waitForResult();

      // refetch balance
      transactionSuccessNotification("Minted 5 $DHAI");

      setIsLoading(false);
    } catch (error) {
      errorNotification(`${error}`);
    } finally {
      setIsLoading(false);
      stopTimer();

      const balance = await wallet!.getBalance(
        createAssetId(contractId, ZeroBytes32).bits
      );
      setTokenBalance(balance);

      await reprepareTxReq();
    }
  };

  const mintTokensWithoutPreparedTxReq = async () => {
    try {
      setIsLoading2(true);
      startTimer2();

      if (!wallet || !contract) {
        return;
      }

      const mintTx = await contract.functions
        .mint(
          {
            Address: {
              bits: wallet.address.toB256(),
            },
          },
          ZeroBytes32,
          bn.parseUnits("5", tokenDecimals)
        )
        .call();

      transactionSubmitNotification("Minting 5 $DHAI");

      await mintTx.waitForResult();

      // refetch balance
      const balance = await wallet.getBalance(
        createAssetId(contractId, ZeroBytes32).bits
      );
      setTokenBalance(balance);

      transactionSuccessNotification("Minted 5 $DHAI");

      setIsLoading2(false);
    } catch (error) {
      errorNotification(`${error}`);
    } finally {
      setIsLoading(false);
      stopTimer2();

      await reprepareTxReq();
    }
  };

  return (
    <>
      <div>
        <div className="flex flex-col items-center justify-between dark:text-zinc-50">
          {walletETHBalance?.lte(0) && (
            <div className="flex flex-col items-center justify-between dark:text-zinc-50 mb-8">
              <span className="text-center text-xl">
                ‼️ You don't have any ETH in your wallet. Please get some ETH from
                the{" "}
                <a
                  href={`https://faucet-testnet.fuel.network/?address=${wallet?.address.toB256()}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-500/80 transition-colors hover:text-green-500"
                >
                  faucet
                </a>{" "}
                and refresh the page.
              </span>
            </div>
          )}

          <Button
            onClick={mintTokens}
            className="w-1/3 mx-auto text-3xl"
            disabled={isLoading}
          >
            Mint ${tokenSymbol}
          </Button>

          <Button
            onClick={mintTokensWithoutPreparedTxReq}
            className="w-1/3 mx-auto text-3xl mt-4"
            disabled={isLoading2}
          >
            Mint ${tokenSymbol} (without optimisation)
          </Button>

          <span className="mt-2 w-full text-center">
            Your wallet currently holds {tokenBalance?.format()} $DHAI
          </span>

          <Button
            onClick={() => disconnect()}
            className="w-1/3 mx-auto mt-4"
            color="secondary"
          >
            Disconnect Wallet
          </Button>
        </div>
      </div>

      {timerDuration > 0 && (
        <div className="text-center text-sm text-gray-500">
          <span className="text-gray-500">
            Transaction (with optimisation) took {timerDuration} ms
          </span>
        </div>
      )}

      {timerDuration2 > 0 && (
        <div className="text-center text-sm text-gray-500">
          <span className="text-gray-500">
            Transaction (without optimisation) took {timerDuration2} ms
          </span>
        </div>
      )}

      {timerDuration > 0 && timerDuration2 > 0 && !isLoading && !isLoading2 && (
        <div className="text-center text-sm text-gray-500">
          <span className="text-gray-500">
            Perf gain with optimisation:{" "}
            {(timerDuration2 - timerDuration).toFixed(2)}ms
          </span>
        </div>
      )}

      {isLocal && <LocalFaucet refetch={refetch} />}
    </>
  );
}
