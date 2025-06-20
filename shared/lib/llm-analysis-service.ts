const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-pro';

/**
 * A service for analyzing MetaMask transactions using an LLM via OpenRouter.
 */
// Define a more specific type for the expected LLM API response
type LlmApiResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
};

export class LlmTransactionAnalysisService {
  private model: string;
  private apiUrl: string;

  constructor(model: string = MODEL, apiUrl: string = OPENROUTER_API_URL) {
    this.model = model;
    this.apiUrl = apiUrl;
  }

  private async getApiKey(): Promise<string> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(['openRouterApiKey'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Failed to retrieve API key from storage.'));
        } else if (result.openRouterApiKey) {
          resolve(result.openRouterApiKey);
        } else {
          reject(
            new Error(
              'API key not found in storage. Please configure it first.',
            ),
          );
        }
      });
    });
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

    let apiKey;
    try {
      apiKey = await this.getApiKey();
    } catch (error) {
      if (error instanceof Error) {
        return { error: error.message };
      }
      return {
        error: 'An unknown error occurred while retrieving the API key.',
      };
    }

    // Diagnostic log to verify the key
    console.log(
      `Using API Key: ${apiKey.substring(0, 5)}...${apiKey.substring(
        apiKey.length - 5,
      )}`,
    );

    const prompt = this.buildPrompt(transactionData);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
      if (!result?.choices?.[0]?.message) {
        throw new Error('Invalid response structure from OpenRouter API');
      }
      return this.parseResponse(result);
    } catch (error) {
      console.error('Error in analyzeTransaction:', error);
      // Re-throwing the error to be handled by the caller
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred during transaction analysis.');
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
      You are a blockchain security expert. Analyze the following Ethereum transaction or signature request
      from a user's perspective and provide a brief, easy-to-understand summary.
      Focus on potential risks.

      Details:
      ${txJson}

      Your analysis should include:
      1. A very short summary of what this request does (e.g., "Sends ETH", "Approves token spending", "Asks you to sign a message").
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
  parseResponse(llmResponse: LlmApiResponse) {
    try {
      const { choices } = llmResponse;
      const content = choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in LLM response');
      }

      // The LLM may return the JSON wrapped in a markdown code block.
      // We need to extract the raw JSON string.
      const jsonRegex = /```json\s*([\s\S]*?)\s*```/u;
      const match = content.match(jsonRegex);

      const jsonString = match?.[1] ?? content;

      return JSON.parse(jsonString);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error('Failed to parse LLM response content:', errorMessage);
      throw new Error(
        `Could not parse content from LLM response: ${errorMessage}`,
      );
    }
  }
}