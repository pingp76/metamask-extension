import { LlmTransactionAnalysisService } from './llm-analysis-service';

const MOCK_API_KEY = 'test-api-key';
const MOCK_MODEL = 'test-model';
const MOCK_API_URL = 'https://mock-openrouter.ai/api/v1/chat/completions';

describe('LlmTransactionAnalysisService', () => {
  let service: LlmTransactionAnalysisService;
  let globalFetch: jest.Mock;

  beforeEach(() => {
    service = new LlmTransactionAnalysisService(
      MOCK_API_KEY,
      MOCK_MODEL,
      MOCK_API_URL,
    );
    globalFetch = jest.fn();
    global.fetch = globalFetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should analyze transaction and return parsed content on success', async () => {
    const mockTransaction = { from: '0x1', to: '0x2', value: '1 ETH' };
    const mockApiResponse = {
      choices: [{ message: { content: '{"analysis":"risky","summary":"This is a test"}' } }],
    };
    globalFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    const result = await service.analyzeTransaction(mockTransaction);

    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(globalFetch).toHaveBeenCalledWith(
      MOCK_API_URL,
      expect.any(Object),
    );
    const fetchOptions = globalFetch.mock.calls[0][1];
    expect(fetchOptions.method).toBe('POST');
    expect(fetchOptions.headers.Authorization).toBe(`Bearer ${MOCK_API_KEY}`);
    const body = JSON.parse(fetchOptions.body);
    expect(body.model).toBe(MOCK_MODEL);
    expect(body.messages[0].content).toContain(JSON.stringify(mockTransaction, null, 2));


    expect(result).toEqual({ analysis: 'risky', summary: 'This is a test' });
  });

  it('should throw an error if the API response is not ok', async () => {
    const mockTransaction = { from: '0x1', to: '0x2', value: '1 ETH' };
    globalFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(service.analyzeTransaction(mockTransaction)).rejects.toThrow(
      'OpenRouter API request failed with status 500: Internal Server Error',
    );
  });

  it('should throw an error if the response content is malformed JSON', async () => {
    const mockTransaction = { from: '0x1', to: '0x2', value: '1 ETH' };
    const mockApiResponse = {
      choices: [{ message: { content: 'this is not json' } }],
    };
    globalFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await expect(service.analyzeTransaction(mockTransaction)).rejects.toThrow(
        /Unexpected token/
    );
  });

  it('should throw an error if the API response structure is unexpected', async () => {
    const mockTransaction = { from: '0x1', to: '0x2', value: '1 ETH' };
    const mockApiResponse = {
      // Missing 'choices' array
    };
     globalFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockApiResponse),
    });

    await expect(service.analyzeTransaction(mockTransaction)).rejects.toThrow(
      'Invalid response structure from OpenRouter API',
    );
  });
});