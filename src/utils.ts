import { SUBMIT_AND_AWAIT_STATUS } from './gql';
import { GraphQLSubscriber } from './GraphQLSubscriber';


/**
 * Function to resolve or reject based on transaction status.
 * @param url - The GraphQL subscription endpoint.
 * @param encodedTransaction - The encoded transaction string.
 * @param fetchFn - The fetch function to use (e.g., global fetch or a custom one).
 * @returns A Promise that resolves on `SUCCESS` and rejects on `FAILURE`.
 */
export async function awaitTransactionStatus(
  url: string,
  encodedTransaction: string,
  fetchFn: typeof fetch
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const subscriber = await GraphQLSubscriber.create({
        url,
        query: SUBMIT_AND_AWAIT_STATUS,
        variables: { encodedTransaction },
        fetchFn,
      });

      for await (const data of subscriber) {
        console.log(data);
        const status = data?.submitAndAwaitStatus?.type;
        if (status === 'SuccessStatus') {
          resolve();
          break;
        } else if (status === 'FailureStatus') {
          reject(new Error(data?.submitAndAwaitStatus?.message || 'Transaction failed.'));
          break;
        }
      }
    } catch (error) {
      reject(error);
    }
  });
}
