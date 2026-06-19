import Document from '../models/Document.js';

/**
 * Write-behind (write-back) cache for document persistence.
 *
 * Incoming content changes are written to an in-memory Map immediately
 * and marked dirty. A periodic flush job batches all dirty entries into
 * a single MongoDB bulkWrite, preventing per-keystroke DB pressure.
 */
class WriteBehindCache {
  constructor() {
    /** @type {Map<string, { content: string, language: string, dirty: boolean }>} */
    this.store = new Map();
    this._timer = null;
  }

  /** Write content into the cache and mark the entry dirty. */
  set(roomId, content, language = 'javascript') {
    const existing = this.store.get(roomId) ?? {};
    this.store.set(roomId, { ...existing, content, language, dirty: true });
  }

  /** Read a cached entry without hitting the DB. */
  get(roomId) {
    return this.store.get(roomId) ?? null;
  }

  /** Hydrate the cache from MongoDB for a room not yet seen this session. */
  async loadFromDB(roomId) {
    const doc = await Document.findOne({ roomId }).lean();
    if (doc) {
      this.store.set(roomId, { content: doc.content, language: doc.language, dirty: false });
    }
    return doc ?? null;
  }

  /** Persist all dirty entries to MongoDB using a bulk upsert. */
  async flush() {
    const dirty = [...this.store.entries()].filter(([, v]) => v.dirty);
    if (dirty.length === 0) return;

    const ops = dirty.map(([roomId, { content, language }]) => ({
      updateOne: {
        filter: { roomId },
        update: { $set: { content, language, updatedAt: new Date() } },
        upsert: true,
      },
    }));

    await Document.bulkWrite(ops, { ordered: false });

    // Clear dirty flag after a successful flush
    dirty.forEach(([roomId]) => {
      const entry = this.store.get(roomId);
      if (entry) entry.dirty = false;
    });

    console.log(`[Cache] Flushed ${dirty.length} room(s) to MongoDB`);
  }

  /** Start the background flush interval. Safe to call multiple times — clears the previous timer. */
  startFlushInterval(ms = 5000) {
    this.stopFlushInterval();
    this._timer = setInterval(() => this.flush().catch(console.error), ms);
    console.log(`[Cache] Write-behind flush interval: ${ms}ms`);
  }

  stopFlushInterval() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  /** Flush remaining dirty entries and stop the interval — call on graceful shutdown. */
  async teardown() {
    this.stopFlushInterval();
    await this.flush();
  }
}

// Singleton — all socket handlers share the same cache instance
export default new WriteBehindCache();
