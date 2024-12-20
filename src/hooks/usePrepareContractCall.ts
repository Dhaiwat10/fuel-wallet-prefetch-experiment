import { FunctionInvocationScope, ScriptTransactionRequest } from "fuels";
import { useEffect, useState, useCallback, useRef } from "react";

export const usePrepareContractCall = (fn?: FunctionInvocationScope) => {
  const [preparedTxReq, setPreparedTxReq] =
    useState<ScriptTransactionRequest>();
  const fnRef = useRef(fn);

  useEffect(() => {
    if (fn && fn !== fnRef.current) {
      fnRef.current = fn;
      (async () => {
        const txReq = await fn.fundWithRequiredCoins();
        setPreparedTxReq(txReq);
      })();
    }
  }, [fn]);

  const reprepareTxReq = useCallback(async () => {
    if (!fnRef.current) {
      return;
    }
    const txReq = await fnRef.current.fundWithRequiredCoins();
    setPreparedTxReq(txReq);
  }, []);

  return {
    preparedTxReq,
    reprepareTxReq,
  };
};
