#!/usr/bin/env bun
/**
 * agent-semantic-cache - Semantic caching layer for LLM responses to reduce latency and cost in multi-agent systems
 */

import { Command } from "commander";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { SemanticCache } from "./cache";
import { OpenAIEmbedder } from "./embedders/openai";
import { LocalVectorStore } from "./storage/local";

async function main() {
  const program = new Command();
  
  program
    .name("semantic-cache")
    .description("CLI for interacting with the semantic cache")
    .version("1.0.0");

  program
    .command("query")
    .description("Search the cache for a semantic match")
    .argument("<text>", "The query text")
    .option("-t, --threshold <number>", "Similarity threshold (0-1)", "0.85")
    .action(async (text, options) => {
      const cache = await initCache();
      const result = await cache.get(text, parseFloat(options.threshold));
      
      if (result) {
        console.log("✅ Cache Hit!");
        console.log("---");
        console.log(result);
      } else {
        console.log("❌ Cache Miss.");
      }
    });

  program
    .command("set")
    .description("Add an entry to the cache")
    .argument("<query>", "The input query")
    .argument("<response>", "The LLM response")
    .action(async (query, response) => {
      const cache = await initCache();
      await cache.set(query, response);
      console.log("✅ Entry cached.");
    });

  program
    .command("stats")
    .description("Show cache statistics")
    .action(async () => {
      const cache = await initCache();
      const stats = await cache.getStats();
      console.log("📊 Cache Stats:");
      console.log(`Total Entries: ${stats.totalEntries}`);
      console.log(`Cache Hits: ${stats.hits}`);
      console.log(`Cache Misses: ${stats.misses}`);
      console.log(`Hit Rate: ${(stats.hitRate * 100).toFixed(2)}%`);
    });

  program
    .command("clear")
    .description("Clear the cache")
    .action(async () => {
      const cache = await initCache();
      await cache.clear();
      console.log("🗑️ Cache cleared.");
    });

  await program.parseAsync(process.argv);
}

async function initCache() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("⚠️  OPENAI_API_KEY not found in environment. Using mock embedder.");
  }

  const store = new LocalVectorStore(join(process.cwd(), "data/cache.json"));
  const embedder = new OpenAIEmbedder(apiKey || "mock-key");
  
  const cache = new SemanticCache({
    embedder,
    store,
    defaultThreshold: 0.85,
  });

  await cache.initialize();
  return cache;
}

main().catch(console.error);
