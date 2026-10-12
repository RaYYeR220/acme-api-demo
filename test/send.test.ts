import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { send, WebhookError } from '../src/webhooks/send';

describe('send', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves when the response is ok', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 200 }));

    await expect(send('https://example.com/hook', { a: 1 })).resolves.toBeUndefined();
  });

  it('resolves for any 2xx status', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 201 }));

    await expect(send('https://example.com/hook', { a: 1 })).resolves.toBeUndefined();
  });

  it('calls fetch exactly once on success', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 200 }));

    await send('https://example.com/hook', { a: 1 });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('passes the given URL through to fetch', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 200 }));

    await send('https://example.com/some/path', { a: 1 });

    expect((fetch as any).mock.calls[0][0]).toBe('https://example.com/some/path');
  });

  it('sends the body as JSON', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 200 }));

    await send('https://example.com/hook', { foo: 'bar', n: 42 });

    const [, options] = (fetch as any).mock.calls[0];
    expect(options.body).toBe(JSON.stringify({ foo: 'bar', n: 42 }));
  });

  it('sends a Content-Type: application/json header', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 200 }));

    await send('https://example.com/hook', { a: 1 });

    const [, options] = (fetch as any).mock.calls[0];
    expect(options.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('uses the POST method', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 200 }));

    await send('https://example.com/hook', { a: 1 });

    const [, options] = (fetch as any).mock.calls[0];
    expect(options.method).toBe('POST');
  });

  it('aborts each attempt after 5 seconds', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout');
    (fetch as any).mockResolvedValue(new Response(null, { status: 200 }));

    await send('https://example.com/hook', { a: 1 });

    expect(timeoutSpy).toHaveBeenCalledWith(5000);
  });

  describe('retries', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('retries a non-ok response and resolves once a later attempt succeeds', async () => {
      (fetch as any)
        .mockResolvedValueOnce(new Response(null, { status: 500 }))
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      const promise = send('https://example.com/hook', { a: 1 });
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('retries a network error and resolves once a later attempt succeeds', async () => {
      (fetch as any)
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      const promise = send('https://example.com/hook', { a: 1 });
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBeUndefined();
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('waits 250ms before the first retry, then doubles the wait each time', async () => {
      (fetch as any).mockResolvedValue(new Response(null, { status: 500 }));

      const promise = send('https://example.com/hook', {});
      promise.catch(() => {});

      await vi.advanceTimersByTimeAsync(0);
      expect(fetch).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(249);
      expect(fetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(499);
      expect(fetch).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(3);

      await vi.advanceTimersByTimeAsync(999);
      expect(fetch).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetch).toHaveBeenCalledTimes(4);

      await expect(promise).rejects.toBeInstanceOf(WebhookError);
    });

    it('gives up after 4 attempts and throws a WebhookError carrying the url and attempt count', async () => {
      (fetch as any).mockResolvedValue(new Response(null, { status: 500 }));

      const promise = send('https://example.com/hook', {});
      const assertion = expect(promise).rejects.toMatchObject({
        url: 'https://example.com/hook',
        attempts: 4,
      });

      await vi.runAllTimersAsync();

      await assertion;
      expect(fetch).toHaveBeenCalledTimes(4);
    });

    it('treats a timed-out attempt as a failure and retries, eventually throwing WebhookError', async () => {
      vi.spyOn(AbortSignal, 'timeout').mockReturnValue(
        AbortSignal.abort(new DOMException('The operation timed out.', 'TimeoutError')),
      );
      (fetch as any).mockImplementation((_url: string, options: { signal: AbortSignal }) =>
        options.signal?.aborted
          ? Promise.reject(new DOMException('The operation timed out.', 'TimeoutError'))
          : Promise.resolve(new Response(null, { status: 200 })),
      );

      const promise = send('https://example.com/hook', {});
      const assertion = expect(promise).rejects.toBeInstanceOf(WebhookError);

      await vi.runAllTimersAsync();

      await assertion;
      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });
});
