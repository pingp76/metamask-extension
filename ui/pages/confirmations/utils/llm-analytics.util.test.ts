import { TransactionType } from '@metamask/transaction-controller';
import { formatTransactionForLLM } from './llm-analytics.util';

describe('formatTransactionForLLM', () => {
  it('should return null if confirmation is invalid or has no txParams/msgParams', () => {
    expect(formatTransactionForLLM(null)).toBeNull();
    // @ts-expect-error - Testing invalid input
    expect(formatTransactionForLLM({})).toBeNull();
    // Test signature request with missing msgParams
    const sigReqWithoutMsgParams = {
      id: '1',
      type: TransactionType.personalSign,
      origin: 'test.com',
    };
    // @ts-expect-error - Testing invalid input
    expect(formatTransactionForLLM(sigReqWithoutMsgParams)).toBeNull();
  });

  it('should format a simple ETH transfer correctly', () => {
    const confirmation = {
      txParams: {
        from: '0x1',
        to: '0x2',
        value: '0xDE0B6B3A7640000', // 1 ETH in Wei
        data: '0x',
      },
      origin: 'dapp.example.com',
      type: TransactionType.simpleSend,
    };
    // @ts-expect-error - Testing legacy structure for tx
    const result = formatTransactionForLLM(confirmation);
    expect(result).toEqual({
      from: '0x1',
      to: '0x2',
      value: '1.0 ETH',
      data: '0x',
      origin: 'dapp.example.com',
      type: TransactionType.simpleSend,
    });
  });

  it('should handle transactions with no value', () => {
    const confirmation = {
      txParams: {
        from: '0x1',
        to: '0x2',
        value: '0x0',
        data: '0xa9059cbb...',
      },
      origin: 'dapp.example.com',
      type: TransactionType.contractInteraction,
    };
    // @ts-expect-error - Testing legacy structure for tx
    const result = formatTransactionForLLM(confirmation);
    expect(result.value).toBe('0 ETH');
  });

  it('should include raw data for contract interactions', () => {
    const confirmation = {
      txParams: {
        from: '0x1',
        to: '0xContract',
        value: '0x0',
        data: '0xa9059cbb000000000000000000000000deadbeefface0000000000000000000000000000',
      },
      origin: 'dapp.example.com',
      type: TransactionType.contractInteraction,
    };
    // @ts-expect-error - Testing legacy structure for tx
    const result = formatTransactionForLLM(confirmation);
    expect(result.data).toBe(
      '0xa9059cbb000000000000000000000000deadbeefface0000000000000000000000000000',
    );
  });

  it('should format a personal_sign request correctly', () => {
    const confirmation = {
      id: 'sig-1',
      type: TransactionType.personalSign,
      origin: 'dapp.example.com',
      msgParams: {
        from: '0xSigner',
        data: '0x48656c6c6f2c20776f726c6421', // "Hello, world!"
        origin: 'dapp.example.com',
      },
    };
    const result = formatTransactionForLLM(confirmation);
    expect(result).toEqual({
      from: '0xSigner',
      origin: 'dapp.example.com',
      type: TransactionType.personalSign,
      message: '0x48656c6c6f2c20776f726c6421',
    });
  });

  it('should format a typed-data signature request correctly', () => {
    const typedData = {
      domain: { name: 'My DApp' },
      message: { contents: 'Hello' },
      primaryType: 'Mail',
      types: { Mail: [{ name: 'contents', type: 'string' }] },
    };
    const confirmation = {
      id: 'sig-2',
      type: TransactionType.signTypedData,
      origin: 'dapp.example.com',
      msgParams: {
        from: '0xSigner2',
        data: typedData,
        origin: 'dapp.example.com',
      },
    };
    const result = formatTransactionForLLM(confirmation);
    expect(result).toEqual({
      from: '0xSigner2',
      origin: 'dapp.example.com',
      type: TransactionType.signTypedData,
      message: JSON.stringify(typedData, null, 2),
    });
  });
});