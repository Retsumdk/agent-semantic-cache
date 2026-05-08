# agent-semantic-cache

A lightweight, semantic caching layer for LLM responses designed for multi-agent systems. Reduce latency and API costs by reusing semantically similar responses.

## Features

- **Semantic Matching**: Uses vector embeddings to find similar queries, not just exact matches.
- **Provider Agnostic**: Built-in support for OpenAI embeddings, with a simple interface for custom embedders.
- **Local Persistence**: Zero-dependency local vector store that persists to JSON.
- **Eviction Strategies**: Supports LRU (Least Recently Used), LFU (Least Frequently Used), and FIFO (First In First Out) eviction.
- **Threshold Control**: Adjustable similarity thresholds per query.
- **CLI Tooling**: Easy-to-use CLI for managing the cache and inspecting stats.

## Why Semantic Caching?

In multi-agent systems, agents often ask similar questions or perform redundant tasks. Standard exact-match caching misses these opportunities. `agent-semantic-cache` understands the intent, allowing you to:
1. **Reduce Latency**: Return results in milliseconds instead of waiting for LLM generation.
2. **Save Costs**: Dramatically cut down on token usage.
3. **Consistency**: Ensure agents receive consistent answers to related prompts.

## Installation

```bash
bun install
```

## Usage

### CLI

Set your OpenAI API key:
```bash
export OPENAI_API_KEY=your_key_here
```

**Set a cache entry:**
```bash
bun src/index.ts set "What is the capital of France?" "The capital of France is Paris."
```

**Query the cache:**
```bash
bun src/index.ts query "Tell me the French capital"
```

**View stats:**
```bash
bun src/index.ts stats
```

### Library

```typescript
import { SemanticCache } from "./src/cache";
import { OpenAIEmbedder } from "./src/embedders/openai";
import { LocalVectorStore } from "./src/storage/local";

const cache = new SemanticCache({
  embedder: new OpenAIEmbedder(process.env.OPENAI_API_KEY),
  store: new LocalVectorStore("./data/cache.json"),
  defaultThreshold: 0.85
});

// Use it in your agent loop
const prompt = "How do I optimize a React component?";
const cached = await cache.get(prompt);

if (cached) {
  return cached;
}

const response = await callLLM(prompt);
await cache.set(prompt, response);
return response;
```

## Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `defaultThreshold` | `0.85` | Similarity score (0-1) required for a match. |
| `maxEntries` | `1000` | Maximum number of entries before eviction. |
| `evictionStrategy` | `"LRU"` | One of: `LRU`, `LFU`, `FIFO`. |

## License

MIT
