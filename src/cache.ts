/**
 * Core Semantic Cache Implementation
 */

export interface EmbeddingResponse {
  vector: number[];
  text: string;
}

export interface Embedder {
  embed(text: string): Promise<number[]>;
}

export interface CacheEntry {
  id: string;
  query: string;
  response: string;
  vector: number[];
  metadata: {
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
  };
}

export interface VectorStore {
  save(entry: CacheEntry): Promise<void>;
  delete(id: string): Promise<void>;
  search(vector: number[], threshold: number): Promise<CacheEntry | null>;
  getAll(): Promise<CacheEntry[]>;
  clear(): Promise<void>;
  count(): Promise<number>;
}

export interface CacheOptions {
  embedder: Embedder;
  store: VectorStore;
  defaultThreshold?: number;
  maxEntries?: number;
  evictionStrategy?: "LRU" | "LFU" | "FIFO";
}

export class SemanticCache {
  private embedder: Embedder;
  private store: VectorStore;
  private defaultThreshold: number;
  private maxEntries: number;
  private evictionStrategy: "LRU" | "LFU" | "FIFO";
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  constructor(options: CacheOptions) {
    this.embedder = options.embedder;
    this.store = options.store;
    this.defaultThreshold = options.defaultThreshold ?? 0.85;
    this.maxEntries = options.maxEntries ?? 1000;
    this.evictionStrategy = options.evictionStrategy ?? "LRU";
  }

  async initialize() {
    // Initialization logic if needed
  }

  /**
   * Get a cached response for a query
   */
  async get(query: string, threshold?: number): Promise<string | null> {
    try {
      const vector = await this.embedder.embed(query);
      const entry = await this.store.search(vector, threshold ?? this.defaultThreshold);

      if (entry) {
        this.stats.hits++;
        entry.metadata.lastAccessed = Date.now();
        entry.metadata.accessCount++;
        await this.store.save(entry);
        return entry.response;
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error("SemanticCache.get error:", error);
      return null;
    }
  }

  /**
   * Set a cached response for a query
   */
  async set(query: string, response: string): Promise<void> {
    try {
      const currentCount = await this.store.count();
      if (currentCount >= this.maxEntries) {
        await this.evict();
      }

      const vector = await this.embedder.embed(query);
      const entry: CacheEntry = {
        id: crypto.randomUUID(),
        query,
        response,
        vector,
        metadata: {
          createdAt: Date.now(),
          lastAccessed: Date.now(),
          accessCount: 1
        }
      };
      await this.store.save(entry);
    } catch (error) {
      console.error("SemanticCache.set error:", error);
    }
  }

  /**
   * Evict an entry based on the chosen strategy
   */
  private async evict(): Promise<void> {
    const entries = await this.store.getAll();
    if (entries.length === 0) return;

    let entryToEvict: CacheEntry = entries[0];

    switch (this.evictionStrategy) {
      case "LRU":
        entryToEvict = entries.reduce((prev, curr) => 
          curr.metadata.lastAccessed < prev.metadata.lastAccessed ? curr : prev
        );
        break;
      case "LFU":
        entryToEvict = entries.reduce((prev, curr) => 
          curr.metadata.accessCount < prev.metadata.accessCount ? curr : prev
        );
        break;
      case "FIFO":
        entryToEvict = entries.reduce((prev, curr) => 
          curr.metadata.createdAt < prev.metadata.createdAt ? curr : prev
        );
        break;
    }

    await this.store.delete(entryToEvict.id);
    this.stats.evictions++;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;
    
    return dotProduct / magnitude;
  }

  async getStats() {
    const total = await this.store.count();
    const hits = this.stats.hits;
    const misses = this.stats.misses;
    const totalCalls = hits + misses;
    
    return {
      totalEntries: total,
      hits,
      misses,
      evictions: this.stats.evictions,
      hitRate: totalCalls > 0 ? hits / totalCalls : 0,
      config: {
        maxEntries: this.maxEntries,
        evictionStrategy: this.evictionStrategy,
        defaultThreshold: this.defaultThreshold
      }
    };
  }

  async clear() {
    await this.store.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }
}
