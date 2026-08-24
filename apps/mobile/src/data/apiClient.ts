// apps/mobile/src/data/apiClient.ts
// V-IH-1: Structured error handling — maps engine error codes to user-friendly messages.
// V-IH-5: Retry with exponential backoff for GET and POST /run.
//         POST /consent is NEVER retried (idempotency risk).
// NEVER edit services/brain/** — this is the UI-side caller only.

const BASE_URL = (import.meta.env.VITE_BRAIN_URL as string) || 'http://localhost:3000';

// ─── V-IH-1: Engine error code → user-facing message ────────────────────────
const ENGINE_ERROR_MESSAGES: Record<string, string> = {
  INVALID_IMAGE:       'Please capture a clearer photo of the bill.',
  INVALID_DOMAIN:      'Invalid document type selected.',
  OCR_TIMEOUT:         'Processing took too long. Please try again.',
  RULEBOOK_LOAD_ERROR: 'Rules temporarily unavailable. Showing advisory results.',
  RUN_NOT_FOUND:       'Session expired. Please rescan.',
  HOLD_NOT_FOUND:      'Session expired. Please rescan.',
};

// Typed error that carries the engine code so callers can branch if needed.
// exported so Results.tsx can do: err instanceof PramaanError
export class PramaanError extends Error {
  readonly userMessage: string;
  readonly code: string;
  readonly httpStatus: number;

  constructor(userMessage: string, code: string, httpStatus: number) {
    super(userMessage);
    this.name = 'PramaanError';
    this.userMessage = userMessage;
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// Parse a non-2xx response body and throw PramaanError with a friendly message.
// Never exposes raw error objects or stack traces to the user.
async function throwFriendlyError(res: Response, method: string, path: string): Promise<never> {
  let code = 'UNKNOWN';
  let rawMessage = `${method} ${path} HTTP ${res.status}`;
  try {
    const body = await res.json() as { error?: string; code?: string; message?: string };
    if (body.code) code = body.code;
    if (body.message) rawMessage = body.message;
  } catch {
    // body wasn't JSON — keep the HTTP status message
  }
  const userMessage = ENGINE_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.';
  console.error(`[apiClient] ${rawMessage} (code=${code})`);
  throw new PramaanError(userMessage, code, res.status);
}

// ─── V-IH-5: Exponential backoff helper ─────────────────────────────────────
// Retries a fetch factory up to maxAttempts times (0ms, 1000ms, 2000ms gaps).
// onRetry callback lets callers show a "Retrying..." message in the UI.
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  onRetry?: (attempt: number) => void,
): Promise<T> {
  const delays = [0, 1000, 2000];
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      if (onRetry) onRetry(attempt + 1);
      await new Promise(r => setTimeout(r, delays[attempt] ?? 2000));
    }
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      // Don't retry on known engine errors (4xx) — only on network/5xx
      if (err instanceof PramaanError && err.httpStatus >= 400 && err.httpStatus < 500) {
        throw err;
      }
      console.warn(`[apiClient] attempt ${attempt + 1}/${maxAttempts} failed:`, err);
    }
  }
  if (lastError instanceof PramaanError) throw lastError;
  throw new PramaanError(
    'Connection lost. Please check the server is running.',
    'CONNECTION_ERROR',
    0,
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────
export const apiClient = {
  // GET with optional retry — used for /run?seed and /audit/:id
  get: async <T>(
    path: string,
    opts?: { retries?: number; onRetry?: (attempt: number) => void },
  ): Promise<T> => {
    const url = `${BASE_URL}${path}`;
    const maxAttempts = opts?.retries ?? 3;
    return withRetry(async () => {
      console.log('[apiClient] GET', url);
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) await throwFriendlyError(res, 'GET', path);
      const json = await res.json() as T;
      console.log('[apiClient] GET response:', json);
      return json;
    }, maxAttempts, opts?.onRetry);
  },

  // POST with optional retry.
  // V-IH-5: pass opts.retries=1 for /consent to disable retry (idempotency risk).
  post: async <T>(
    path: string,
    data: unknown,
    opts?: { retries?: number; onRetry?: (attempt: number) => void },
  ): Promise<T> => {
    const url = `${BASE_URL}${path}`;
    const maxAttempts = opts?.retries ?? 3;
    return withRetry(async () => {
      console.log('[apiClient] POST', url, data);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) await throwFriendlyError(res, 'POST', path);
      const json = await res.json() as T;
      console.log('[apiClient] POST response:', json);
      return json;
    }, maxAttempts, opts?.onRetry);
  },
};
