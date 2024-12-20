# Transaction Dependencies Prefetching Experiment

## Goal

Eliminate the several seconds of waiting seen after the user clicking the "Mint" button, and the transaction being submitted to the chain. This delay is caused by the contract call being prepared, which involves fetching the transaction dependencies from the chain. This delay is often even longer than the time between the tx being submitted and the tx being confirmed. This makes our chain look way slower than it actually is.

## Proposed Solution

This delay can be eliminated by prefetching the dependencies beforehand.

```ts
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
```

```tsx
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

const onMintPress = async () => {
    await wallet.sendTransaction(preparedTxReq);
};
```


In this experiment, I tried calling the `mint` function on this SRC20 contract with two different approaches: one that uses pre-fetched tx dependencies, and one that doesn't.

### How does prefetching dependencies work?

Whenever the page loads, the `usePrepareContractCall` hook is called. This hook returns a `preparedTxReq` object, which is a `ScriptTransactionRequest` object. The `ScriptTransactionRequest` object contains the transaction dependencies that are needed to execute the contract call. These dependencies are fetched from the chain using the `fundWithRequiredCoins` method.

Whenever the user clicks the "Mint" button, instead of `call`ing the contract funciton directly (which would cause the delay), we simply do a `wallet.sendTransaction(preparedTxReq)`. We can do this because the transaction request is already prepared and ready to be sent.

If we don't prefetch the dependencies, the `call` method will do that when it's called, and the user will see the delay.

### Numbers

On an average, I saw a performance gain of about 2-3 seconds on the testnet.

### Next Steps

We can consider providing `usePrepareContractCall` with the `@fuels/react` package, so that anyone can opt-in to this pre-fetching feature easily, without causing any breaking changes.

If we don't want to do that now, we can at least consider adding this into our cookbook for the TS SDK docs.

### Things to Note

This only works for the burner wallet as of now, since we probably need to make some small tweaks to other connectors to support this feature.