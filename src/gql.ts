import gql from 'graphql-tag';

const SUBMIT_AND_AWAIT_STATUS = gql`
  subscription submitAndAwaitStatus($encodedTransaction: HexString!) {
    submitAndAwaitStatus(tx: $encodedTransaction) {
      ...transactionStatusSubscriptionFragment
    }
  }

  fragment transactionStatusSubscriptionFragment on TransactionStatus {
    ... on SubmittedStatus {
      ...SubmittedStatusFragment
    }
    ... on SuccessStatus {
      ...SuccessStatusWithBlockIdFragment
      transaction {
        ...malleableTransactionFieldsFragment
      }
    }
    ... on FailureStatus {
      ...FailureStatusWithBlockIdFragment
      transaction {
        ...malleableTransactionFieldsFragment
      }
    }
    ... on SqueezedOutStatus {
      ...SqueezedOutStatusFragment
    }
  }

  fragment SubmittedStatusFragment on SubmittedStatus {
    type: __typename
    time
  }

  fragment SuccessStatusWithBlockIdFragment on SuccessStatus {
    ...SuccessStatusFragment
    block {
      id
    }
  }

  fragment SuccessStatusFragment on SuccessStatus {
    type: __typename
    time
    programState {
      returnType
      data
    }
    receipts {
      ...receiptFragment
    }
    totalGas
    totalFee
  }

  fragment receiptFragment on Receipt {
    id
    pc
    is
    to
    toAddress
    amount
    assetId
    gas
    param1
    param2
    val
    ptr
    digest
    reason
    ra
    rb
    rc
    rd
    len
    receiptType
    result
    gasUsed
    data
    sender
    recipient
    nonce
    contractId
    subId
  }

  fragment malleableTransactionFieldsFragment on Transaction {
    receiptsRoot
    inputs {
      type: __typename
      ... on InputCoin {
        txPointer
      }
      ... on InputContract {
        txPointer
      }
    }
    outputs {
      type: __typename
      ... on CoinOutput {
        to
        amount
        assetId
      }
      ... on ContractOutput {
        inputIndex
        balanceRoot
        stateRoot
      }
      ... on ChangeOutput {
        to
        amount
        assetId
      }
      ... on VariableOutput {
        to
        amount
        assetId
      }
      ... on ContractCreated {
        contract
        stateRoot
      }
    }
  }

  fragment FailureStatusWithBlockIdFragment on FailureStatus {
    ...FailureStatusFragment
    block {
      id
    }
  }

  fragment FailureStatusFragment on FailureStatus {
    type: __typename
    totalGas
    totalFee
    time
    reason
    receipts {
      ...receiptFragment
    }
  }

  fragment SqueezedOutStatusFragment on SqueezedOutStatus {
    type: __typename
    reason
  }
`;

export { SUBMIT_AND_AWAIT_STATUS };
