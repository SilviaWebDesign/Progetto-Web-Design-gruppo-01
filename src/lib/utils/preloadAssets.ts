const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Preload asset URLs so 3D loaders hit a warm cache (important on slow links).
 * Reports 0..1 progress. Byte-accurate when the server sends Content-Length,
 * otherwise falls back to per-file counting.
 */
export async function preloadAssets(
  urls: string[],
  onProgress: (p: number) => void
): Promise<void> {
  if (urls.length === 0) {
    onProgress(1);
    return;
  }

  const sizes = await Promise.all(
    urls.map(async (u) => {
      try {
        const r = await fetch(u, { method: 'HEAD' });
        return Number(r.headers.get('content-length')) || 0;
      } catch {
        return 0;
      }
    })
  );
  const total = sizes.reduce((a, b) => a + b, 0);
  const loaded = new Array(urls.length).fill(0);
  let doneCount = 0;

  const report = () => {
    if (total > 0) onProgress(clamp(loaded.reduce((a, b) => a + b, 0) / total, 0, 1));
    else onProgress(doneCount / urls.length);
  };

  await Promise.all(
    urls.map(async (u, i) => {
      try {
        const res = await fetch(u);
        const reader = res.body?.getReader();
        if (reader && total > 0) {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            loaded[i] += value.length;
            report();
          }
        } else {
          await res.arrayBuffer(); // consume so it lands in cache
        }
      } catch {
        // ignore; the real loader will surface any error later
      } finally {
        loaded[i] = sizes[i];
        doneCount += 1;
        report();
      }
    })
  );
  onProgress(1);
}