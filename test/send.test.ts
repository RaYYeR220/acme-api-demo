import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { send } from '../src/webhooks/send';

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

  it('throws webhook failed on 400', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 400 }));

    await expect(send('https://example.com/hook', {})).rejects.toThrow('webhook failed');
  });

  it('throws webhook failed on 404', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 404 }));

    await expect(send('https://example.com/hook', {})).rejects.toThrow('webhook failed');
  });

  it('throws webhook failed on 500', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 500 }));

    await expect(send('https://example.com/hook', {})).rejects.toThrow('webhook failed');
  });

  it('throws an Error instance on non-ok response', async () => {
    (fetch as any).mockResolvedValue(new Response(null, { status: 503 }));

    await expect(send('https://example.com/hook', {})).rejects.toBeInstanceOf(Error);
  });

  it('calls fetch exactly once', async () => {
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

  it('propagates a network error from fetch without wrapping it', async () => {
    (fetch as any).mockRejectedValue(new Error('network down'));

    await expect(send('https://example.com/hook', {})).rejects.toThrow('network down');
  });
});
