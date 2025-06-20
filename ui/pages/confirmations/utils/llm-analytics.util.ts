import { ethers } from 'ethers';

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

/**
 * Extracts key information from a MetaMask confirmation object and formats it
 * into a structured object suitable for sending to an LLM for analysis.
 *
 * @param {Confirmation} confirmation - The confirmation object from MetaMask,
 * which contains transaction details.
 * @returns {object|null} A structured object with transaction details for the LLM,
 * or null if the input is invalid.
 */
export const formatTransactionForLLM = (confirmation: Confirmation) => {
  if (!confirmation || !confirmation.txParams) {
    return null;
  }

  const { txParams, origin } = confirmation;

  // Key details to extract for analysis
  const details = {
    from: txParams.from,
    to: txParams.to,
    value: '0 ETH',
    data: txParams.data,
    origin, // The dApp initiating the transaction
    type: confirmation.type, // e.g., 'contractInteraction', 'simpleSend'
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