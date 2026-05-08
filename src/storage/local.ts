import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { VectorStore, CacheEntry } from "../cache";
import { SemanticCache } from "../cache";

export class LocalVectorStore implements VectorStore {
  private path: string;
  private entries: Map<string, CacheEntry> = new Map();

  constructor(path: string) {
    this.path = path;
  }

  async save(entry: CacheEntry): Promise<void> {
    this.entries.set(entry.id, entry);
    await this.persist();
  }

  async delete(id: string): Promise<void> {
    this.entries.delete(id);
    await this.persist();
  }

  async search(vector: number[], threshold: number): Promise<CacheEntry | null> {
    await this.load();
    
    let bestMatch: CacheEntry | null = null;
    let highestSimilarity = -1;

    for (const entry of this.entries.values()) {
      const similarity = SemanticCache.cosineSimilarity(vector, entry.vector);
      if (similarity >= threshold && similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = entry;
      }
    }

    return bestMatch;
  }

  async getAll(): Promise<CacheEntry[]> {
    await this.load();
    return Array.from(this.entries.values());
  }

  async clear(): Promise<void> {
    this.entries.clear();
    await this.persist();
  }

  async count(): Promise<number> {
    await this.load();
    return this.entries.size;
  }

  private async load() {
    if (this.entries.size > 0) return;
    if (!existsSync(this.path)) return;

    try {
      const data = readFileSync(this.path, "utf-8");
      const list: CacheEntry[] = JSON.parse(data);
      for (const entry of list) {
        this.entries.set(entry.id, entry);
      }
    } catch (error) {
      console.error("LocalVectorStore.load error:", error);
    }
  }

  private async persist() {
    try {
      const dir = dirname(this.path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const list = Array.from(this.entries.values());
      writeFileSync(this.path, JSON.stringify(list, null, 2));
    } catch (error) {
      console.error("LocalVectorStore.persist error:", error);
    }
  }
}
