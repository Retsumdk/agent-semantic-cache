import { expect, test, describe, beforeEach } from "bun:test";
import { SemanticCache } from "../src/cache";
import { OpenAIEmbedder } from "../src/embedders/openai";
import { LocalVectorStore } from "../src/storage/local";
import { rmSync, existsSync } from "node:fs";
import { join } from "node:path";

describe("SemanticCache", () => {
  const testDbPath = join(process.cwd(), "data/test-cache.json");
  let cache: SemanticCache;

  beforeEach(async () => {
    if (existsSync(testDbPath)) {
      rmSync(testDbPath);
    }
    const store = new LocalVectorStore(testDbPath);
    const embedder = new OpenAIEmbedder("mock-key");
    cache = new SemanticCache({
      embedder,
      store,
      defaultThreshold: 0.9,
      maxEntries: 3,
      evictionStrategy: "LRU"
    });
    await cache.initialize();
  });

  test("should store and retrieve an exact match", async () => {
    await cache.set("hello world", "greeting");
    const result = await cache.get("hello world");
    expect(result).toBe("greeting");
  });

  test("should retrieve a semantic match", async () => {
    await cache.set("How is the weather today?", "It is sunny.");
    // With normalization, "How is the weather today!" should match "How is the weather today?"
    const result = await cache.get("How is the weather today!", 0.9);
    expect(result).toBe("It is sunny.");
  });

  test("should return null on cache miss", async () => {
    await cache.set("apples", "fruit");
    const result = await cache.get("automobiles", 0.99);
    expect(result).toBeNull();
  });

  test("should evict oldest entry on LRU strategy", async () => {
    await cache.set("one", "1");
    await new Promise(resolve => setTimeout(resolve, 10));
    await cache.set("two", "2");
    await new Promise(resolve => setTimeout(resolve, 10));
    await cache.set("three", "3");
    
    // Access "one" to make it most recent
    await cache.get("one");
    
    // Set "four", should evict "two" (as "three" is older than "one" but "two" is oldest)
    await cache.set("four", "4");
    
    expect(await cache.get("two")).toBeNull();
    expect(await cache.get("one")).toBe("1");
    expect(await cache.get("three")).toBe("3");
    expect(await cache.get("four")).toBe("4");
  });

  test("should clear the cache", async () => {
    await cache.set("test", "data");
    await cache.clear();
    const stats = await cache.getStats();
    expect(stats.totalEntries).toBe(0);
  });
});
