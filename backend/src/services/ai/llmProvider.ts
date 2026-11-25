import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

export interface LLMMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

export interface LLMGenerationOptions {
  systemPrompt: string;
  messages: LLMMessage[];
  temperature?: number;
  jsonMode?: boolean;
}

export interface LLMProvider {
  readonly name: string;
  isConfigured(): boolean;
  generateText(options: LLMGenerationOptions): Promise<string>;
  generateEmbedding(text: string): Promise<number[]>;
}

export class GeminiLLMProvider implements LLMProvider {
  public readonly name = 'google-gemini';
  private client: GoogleGenerativeAI | null = null;

  constructor(private apiKey: string | undefined = env.GEMINI_API_KEY) {
    if (apiKey && apiKey.trim().length > 10 && !apiKey.includes('your_gemini_api_key')) {
      this.client = new GoogleGenerativeAI(apiKey.trim());
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async generateText(options: LLMGenerationOptions): Promise<string> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is not configured. Add a valid key in .env or switch to Demo Mode.');
    }

    const maxAttempts = 2;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const model = this.client.getGenerativeModel({
          model: env.GEMINI_MODEL,
          systemInstruction: options.systemPrompt,
          generationConfig: {
            temperature: options.temperature ?? 0.4,
            ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
          },
        });

        const contents = options.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'model' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));

        const result = await model.generateContent({ contents });
        const text = result.response.text();
        if (!text) {
          throw new Error('Gemini returned an empty response.');
        }
        return text;
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('API_KEY_INVALID') || msg.includes('401') || msg.includes('403')) {
          throw new AppError('Gemini API key is invalid or unauthorized. Please check GEMINI_API_KEY.', 401, 'GEMINI_AUTH_ERROR');
        }
        // Do not retry 429 rate-limit or 503 high-demand responses to avoid multiplying RPM
        if (msg.includes('429') || msg.includes('503') || msg.includes('404')) {
          break;
        }
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    throw new AppError(
      `Gemini API request failed: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
      502,
      'GEMINI_API_ERROR'
    );
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('GEMINI_API_KEY is not configured for embeddings.');
    }
    const embedModel = this.client.getGenerativeModel({ model: env.GEMINI_EMBEDDING_MODEL });
    const result = await embedModel.embedContent(text);
    return result.embedding.values;
  }
}

export const geminiProvider = new GeminiLLMProvider();
