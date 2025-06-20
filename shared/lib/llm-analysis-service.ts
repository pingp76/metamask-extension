const OPENROUTER_API_KEY =
  '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';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-pro';

/**
 * A service for analyzing MetaMask transactions using an LLM via OpenRouter.
 */
export class LlmTransactionAnalysisService {
  private apiKey: string;
  private model: string;
  private apiUrl: string;
  /**
   * Creates an instance of LlmTransactionAnalysisService.
   *
   * @param apiKey - The OpenRouter API key.
   * @param model - The model to use for the analysis.
   * @param apiUrl - The URL for the OpenRouter Chat Completions API.
   */
  constructor(
    apiKey: string = OPENROUTER_API_KEY,
    model: string = MODEL,
    apiUrl: string = OPENROUTER_API_URL,
  ) {
    this.apiKey = apiKey;
    this.model = model;
    this.apiUrl = apiUrl;
  }
  /**
   * Analyzes the given transaction data by sending it to an LLM.
   *
   * @param transactionData - The formatted transaction data from
   * formatTransactionForLLM.
   * @returns An object containing the analysis result.
   */
  async analyzeTransaction(transactionData: Record<string, unknown>) {
    if (!transactionData) {
      return {
        error: 'Invalid transaction data provided.',
      };
    }

    const prompt = this.buildPrompt(transactionData);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `OpenRouter API request failed with status ${response.status}: ${response.statusText}`,
        );
      }

      const result = await response.json();
      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        throw new Error('Invalid response structure from OpenRouter API');
      }
      return this.parseResponse(result);
    } catch (error: any) {
      console.error('Error in analyzeTransaction:', error);
      throw error;
    }
  }

  /**
   * Builds the prompt to be sent to the LLM.
   *
   * @param txData - The transaction data.
   * @returns The prompt string.
   */
  buildPrompt(txData: Record<string, unknown>) {
    const txJson = JSON.stringify(txData, null, 2);
    return `
      You are a blockchain security expert. Analyze the following Ethereum transaction
      from a user's perspective and provide a brief, easy-to-understand summary.
      Focus on potential risks.

      Transaction Details:
      ${txJson}

      Your analysis should include:
      1. A very short summary of what this transaction does (e.g., "Sends ETH", "Approves token spending", "Interacts with a contract").
      2. A clear risk assessment (low, medium, or high).
      3. A one-sentence explanation of the biggest potential risk.

      Format your response as a JSON object with two keys: "analysis" (a string containing your summary and risk explanation) and "riskLevel" (a string: "low", "medium", or "high").
    `;
  }

  /**
   * Parses the JSON response from the LLM.
   *
   * @param llmResponse - The raw response object from the OpenRouter API.
   * @returns An object with "analysis" and "riskLevel" keys.
   */
  parseResponse(llmResponse: any) {
    try {
      let content = llmResponse.choices[0].message.content;

      // The LLM may return the JSON wrapped in a markdown code block.
      // We need to extract the raw JSON string.
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = content.match(jsonRegex);

      if (match && match[1]) {
        content = match[1];
      }

      return JSON.parse(content);
    } catch (e: any) {
      console.error('Failed to parse LLM response content:', e);
      throw new Error(`Could not parse content from LLM response: ${e.message}`);
    }
  }
}