import { createHash } from 'node:crypto';

const PREVIEW_CACHE_LIMIT = 20;

/**
 * Recently previewed BMPs keyed by a hash of their bytes, so Paint and Download
 * send exactly the pixels the studio showed. Oldest entries are evicted first.
 */
export class PreviewCache {
  private readonly bmps = new Map<string, Buffer>();

  constructor(private readonly limit = PREVIEW_CACHE_LIMIT) {}

  /** Stores a BMP and returns its token. */
  remember(bmp: Buffer): string {
    const token = createHash('sha256').update(bmp).digest('hex');
    this.bmps.delete(token);
    this.bmps.set(token, bmp);
    while (this.bmps.size > this.limit) {
      const oldestToken = this.bmps.keys().next().value;
      if (oldestToken) this.bmps.delete(oldestToken);
    }
    return token;
  }

  get(token: string): Buffer | undefined {
    return this.bmps.get(token);
  }
}
