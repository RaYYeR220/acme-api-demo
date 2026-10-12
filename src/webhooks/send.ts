const MAX_ATTEMPTS = 4;
const BASE_DELAY_MS = 250;
const TIMEOUT_MS = 5000;

export class WebhookError extends Error {
  readonly url: string;
  readonly attempts: number;

  constructor(url: string, attempts: number) {
    super(`webhook failed for ${url} after ${attempts} attempts`);
    this.name = 'WebhookError';
    this.url = url;
    this.attempts = attempts;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function send(url: string, body: unknown): Promise<void> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error('webhook failed');
      }

      return;
    } catch {
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new WebhookError(url, MAX_ATTEMPTS);
      }
      await wait(BASE_DELAY_MS * 2 ** attempt);
    }
  }
}
