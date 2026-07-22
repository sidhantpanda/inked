interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/** TTL cache with request coalescing, shared by every Sports widget slot. */
export class SportsCache {
  private readonly values = new Map<string, CacheEntry<unknown>>();
  private readonly pending = new Map<string, Promise<unknown>>();

  async getOrLoad<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const cached = this.values.get(key) as CacheEntry<T> | undefined;
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const inFlight = this.pending.get(key) as Promise<T> | undefined;
    if (inFlight) return inFlight;

    const promise = load()
      .then((value) => {
        this.values.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return promise;
  }
}
