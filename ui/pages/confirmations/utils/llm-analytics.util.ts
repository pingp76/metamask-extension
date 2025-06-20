import { ethers } from 'ethers';
import {
  Confirmation,
  SignatureRequestType,
} from '../types/confirm';

// It's a good practice to define an interface for the complex objects you expect.
// This is a simplified version based on our analysis.
// We can expand it as we learn more about the confirmation object.
interface TxParams {
  from: string;
  to?: string; // The 'to' address can be undefined for contract creation transactions
  value?: string;
  data: string;
}

interface Confirmation {
  txParams: TxParams;
  origin: string;
  type: string;
}

// Type guard to check if the confirmation is a signature request
const isSignatureRequest = (
  confirmation: Confirmation,
): confirmation is SignatureRequestType => {
  return 'msgParams' in confirmation && confirmation.msgParams !== undefined;
};

/**
 * Extracts key information from a MetaMask confirmation object and formats it
 * into a structured object suitable for sending to an LLM for analysis.
 *
 * @param confirmation - The confirmation object from MetaMask,
 * which can be a transaction or a signature request.
 * @returns A structured object with details for the LLM,
 * or null if the input is invalid or cannot be handled.
 */
export const formatTransactionForLLM = (confirmation: Confirmation) => {
  if (!confirmation) {
    return null;
  }

  if (isSignatureRequest(confirmation)) {
    const { msgParams, type, origin } = confirmation;

    if (!msgParams) {
      return null;
    }

    // For signature requests, the 'data' can be a string or a complex object.
    // We'll stringify the object for the PoC.
    const messageToSign =
      typeof msgParams.data === 'string'
        ? msgParams.data
        : JSON.stringify(msgParams.data, null, 2);

    return {
      from: msgParams.from,
      origin: origin ?? msgParams.origin, // Fallback to msgParams.origin
      type, // e.g., 'personal_sign', 'eth_signTypedData_v4'
      message: messageToSign,
    };
  }

  // Handle standard transactions (TransactionMeta)
  if (!('txParams' in confirmation) || !confirmation.txParams) {
    return null;
  }

  const { txParams, origin, type } = confirmation;

  // Key details to extract for analysis
  const details = {
    from: txParams.from,
    to: txParams.to,
    value: '0 ETH',
    data: txParams.data,
    origin: origin ?? 'Unknown Origin', // The dApp initiating the transaction
    type, // e.g., 'contractInteraction', 'simpleSend'
  };

  // Convert hex value (in Wei) to a human-readable ETH string
  if (txParams.value && txParams.value !== '0x0') {
    try {
      const valueInWei = ethers.BigNumber.from(txParams.value);
      details.value = `${ethers.utils.formatEther(valueInWei)} ETH`;
    } catch (error) {
      console.error('Error converting transaction value:', error);
      // Keep the default '0 ETH' or handle as needed
    }
  }

  // TODO: Add decoding of transaction data ('data' field) to extract
  // function name and parameters if an ABI is available. For PoC, raw data is sent.

  return details;
};