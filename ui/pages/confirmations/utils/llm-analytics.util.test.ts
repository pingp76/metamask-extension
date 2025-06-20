import { formatTransactionForLLM } from './llm-analytics.util';

describe('formatTransactionForLLM', () => {
  it('should return null if confirmation is invalid', () => {
    expect(formatTransactionForLLM(null)).toBeNull();
    expect(formatTransactionForLLM({})).toBeNull();
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
      type: 'simpleSend',
    };
    const result = formatTransactionForLLM(confirmation);
    expect(result).toEqual({
      from: '0x1',
      to: '0x2',
      value: '1.0 ETH',
      data: '0x',
      origin: 'dapp.example.com',
      type: 'simpleSend',
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
      type: 'contractInteraction',
    };
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
      type: 'contractInteraction',
    };
    const result = formatTransactionForLLM(confirmation);
    expect(result.data).toBe(
      '0xa9059cbb000000000000000000000000deadbeefface0000000000000000000000000000',
    );
  });
});