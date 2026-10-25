import https from 'https';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'google/gemini-3.5-flash-lite';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Executes a chat completion request against OpenRouter.
 */
export async function callOpenRouter(
  messages: ChatMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const apiKey = OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured in .env');
  }

  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || 2500;
  const temperature = options.temperature ?? 0.2;

  const payload = JSON.stringify({
    model,
    max_tokens: maxTokens,
    temperature,
    messages,
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'TLE Ragnarok Courtroom',
        },
        timeout: 25000,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              const content = parsed.choices?.[0]?.message?.content || '';
              resolve(content);
            } catch (err: any) {
              reject(new Error(`Failed to parse OpenRouter response: ${err.message}`));
            }
          } else {
            reject(
              new Error(
                `OpenRouter API error (HTTP ${res.statusCode}): ${body.slice(0, 300)}`
              )
            );
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('OpenRouter request timed out after 25s'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

/**
 * Calls the LLM and safely parses structured JSON response.
 * Automatically strips Markdown code blocks if present.
 */
export async function callJsonLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  fallback: T,
  options: LLMOptions = {}
): Promise<T> {
  try {
    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `${systemPrompt}\n\nCRITICAL: You MUST respond ONLY with valid, parseable JSON matching the requested structure. Do not wrap in conversational text or commentary.`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      options
    );

    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    const startIndex =
      firstBrace >= 0 && firstBracket >= 0
        ? Math.min(firstBrace, firstBracket)
        : Math.max(firstBrace, firstBracket);

    if (startIndex >= 0) {
      const lastBrace = clean.lastIndexOf('}');
      const lastBracket = clean.lastIndexOf(']');
      const endIndex = Math.max(lastBrace, lastBracket);
      if (endIndex > startIndex) {
        clean = clean.substring(startIndex, endIndex + 1);
      }
    }

    return JSON.parse(clean) as T;
  } catch (err: any) {
    console.warn(`[AI Engine] LLM call failed or could not parse JSON (${err.message}). Using calibrated fallback.`);
    return fallback;
  }
}
