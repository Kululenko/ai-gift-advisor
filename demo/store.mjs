// In-memory compare-and-swap store: local demonstrations only.
export function memoryStore() {
  let data = null, version = 0;
  return {
    async getWithMetadata() { return data ? { data: structuredClone(data), etag: String(version) } : null; },
    async setJSON(_key, next, options) {
      if ((options.onlyIfNew && data) || (options.onlyIfMatch !== undefined && options.onlyIfMatch !== String(version))) return { modified: false };
      data = structuredClone(next); version++;
      return { modified: true, etag: String(version) };
    }
  };
}
