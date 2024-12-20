# Transaction Dependencies Prefetching Experiment

Try out the demo at https://fuel-wallet-prefetch-experiment-75ug.vercel.app/

## Goal

Eliminate the several seconds of waiting seen after the user clicking the "Mint" button, and the transaction being submitted to the chain. This delay is caused by the contract call being prepared, which involves fetching the transaction dependencies from the chain. This delay is often even longer than the time between the tx being submitted and the tx being confirmed. This makes our chain look way slower than it actually is.

## Proposed Solution

This delay can be eliminated by prefetching the dependencies beforehand.

(very very basic implementation, lots of rough edges)

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

```tsx
// Potential usage example
import { usePrepareContractCall } from "@fuels/react";

const { preparedTx, reprepareTx } = usePrepareContractCall({
    contract,
    method: 'mint',
    args: [...]
});

const onMintPress = async () => {
    await wallet.sendTransaction(preparedTx);
};

```

If we don't want to do that now, we can at least consider adding this into our cookbook for the TS SDK docs.

### Things to Note

- This only works for the burner wallet as of now, since we probably need to make some small tweaks to other connectors to support this feature.

- This is a very very basic implementation with lots of rough edges.

### Edge Cases
 
- There could be a case where a user spends some UTXOs which were included as a part of the transaction dependencies after they have been fetched. This would cause the `sendTransaction` method to fail. In this case, we can simply refetch the dependencies again. 

- We will need to re-fetch the dependencies whenever the user does a transaction, in case there are multiple transaction calls present on the page.

- We will need to re-fetch dependencies wehnever the user changes any of the inputs to the contract call as well. This can be optimised for max perf, and the input can easily be debounced. But something to keep in mind for now.
