import https from 'https';
import dotenv from 'dotenv';
import path from 'path';

// Ensure .env is loaded
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'google/gemini-3.5-flash-lite';

export const CONFIGURED_MAX_TOKENS = parseInt(
  process.env.MAX_TOKENS || process.env.LLM_MAX_TOKENS || '450',
  10
);
export const DEFAULT_MAX_TOKENS = CONFIGURED_MAX_TOKENS;

// Dynamic session token ceiling (automatically backs off if OpenRouter reports lower key affordability)
let sessionMaxTokens = CONFIGURED_MAX_TOKENS;

export function getSessionMaxTokens(): number {
  return sessionMaxTokens;
}

export function setSessionMaxTokens(tokens: number): void {
  sessionMaxTokens = Math.max(tokens, 50);
}

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
 * Features:
 * - Hard-capped to CONFIGURED_MAX_TOKENS (default 450, configurable in .env)
 * - Automatic 402 Credit Affordability Backoff & Retry
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
  const initialCap = Math.min(
    options.maxTokens || CONFIGURED_MAX_TOKENS,
    sessionMaxTokens,
    CONFIGURED_MAX_TOKENS
  );
  const temperature = options.temperature ?? 0.2;

  function executeRequest(tokenLimit: number, isRetry: boolean = false): Promise<string> {
    const payload = JSON.stringify({
      model,
      max_tokens: tokenLimit,
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
            } else if (res.statusCode === 402) {
              const affordMatch = body.match(/can only afford (\d+)/i);
              const affordableTokens = affordMatch ? parseInt(affordMatch[1], 10) : 0;

              if (!isRetry && affordableTokens >= 70 && tokenLimit > affordableTokens - 15) {
                const nextTokens = Math.max(affordableTokens - 15, 50);
                sessionMaxTokens = nextTokens;
                // Auto-retry once with adjusted affordability limit
                executeRequest(nextTokens, true).then(resolve).catch(reject);
              } else {
                reject(
                  new Error(
                    `OpenRouter credit reservation limit (HTTP 402): Key cannot afford requested tokens.`
                  )
                );
              }
            } else {
              reject(
                new Error(
                  `OpenRouter API error (HTTP ${res.statusCode}): ${body.slice(0, 200)}`
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

  return executeRequest(initialCap, false);
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
          content: `${systemPrompt}\n\nCRITICAL: Respond ONLY with valid, parseable JSON matching the requested structure. Keep response concise under ${sessionMaxTokens} tokens. Do not include markdown preamble or conversational explanations.`,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      {
        ...options,
        maxTokens: Math.min(options.maxTokens || CONFIGURED_MAX_TOKENS, sessionMaxTokens),
      }
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
    console.warn(`[AI Engine] LLM notice: ${err.message}. Seamlessly engaging calibrated reasoning engine.`);
    return fallback;
  }
}
