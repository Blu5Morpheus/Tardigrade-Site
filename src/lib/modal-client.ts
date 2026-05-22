/**
 * Thin client for the Modal backend. Each demo's React island uses these
 * helpers instead of raw fetch so error handling, JSON parsing, and SSE
 * subscription are consistent.
 *
 * Two shapes:
 *   `jsonPost`  — sync POST returning JSON
 *   `sseStream` — EventSource-style streaming, fires onEvent for each
 *                  named SSE event the server emits
 */

export interface SSEHandlers {
  onEvent?: (eventName: string, data: unknown) => void;
  onError?: (err: Error) => void;
  onClose?: () => void;
}

export async function jsonPost<T = unknown>(
  base: string,
  path: string,
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> {
  if (!base) throw new Error('Modal endpoint not configured for this demo.');
  const url = `${base.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} — ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export async function jsonGet<T = unknown>(
  base: string,
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  if (!base) throw new Error('Modal endpoint not configured for this demo.');
  const url = `${base.replace(/\/$/, '')}${path}`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * Subscribe to a Server-Sent Events stream. Returns a function that
 * cancels the stream. Parses both default-event and named-event frames.
 *
 * Implemented with fetch + ReadableStream rather than EventSource so
 * we can carry an AbortSignal and pass GET query params cleanly.
 */
export function sseStream(
  base: string,
  path: string,
  params: Record<string, string | number | boolean>,
  handlers: SSEHandlers,
): () => void {
  if (!base) {
    handlers.onError?.(new Error('Modal endpoint not configured for this demo.'));
    handlers.onClose?.();
    return () => {};
  }

  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );
  const url = `${base.replace(/\/$/, '')}${path}?${qs}`;
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      // SSE frames are separated by a blank line. Each frame may have
      // multiple `event:` / `data:` lines.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const rawFrame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          let eventName = 'message';
          const dataLines: string[] = [];
          for (const line of rawFrame.split('\n')) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          }
          if (dataLines.length === 0) continue;
          const raw = dataLines.join('\n');
          let parsed: unknown = raw;
          try {
            parsed = JSON.parse(raw);
          } catch {
            /* leave as string */
          }
          handlers.onEvent?.(eventName, parsed);
        }
      }
      handlers.onClose?.();
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        handlers.onClose?.();
        return;
      }
      handlers.onError?.(err as Error);
      handlers.onClose?.();
    }
  })();

  return () => controller.abort();
}
