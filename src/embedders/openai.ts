import type { Embedder } from "../cache";

export class OpenAIEmbedder implements Embedder {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "text-embedding-3-small") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    if (this.apiKey === "mock-key") {
      return this.generateMockEmbedding(text);
    }

    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: text,
          model: this.model,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
      }

      const result = await response.json();
      return result.data[0].embedding;
    } catch (error) {
      console.error("OpenAIEmbedder error:", error);
      // Fallback to mock for local dev robustness
      return this.generateMockEmbedding(text);
    }
  }

  /**
   * Generates a deterministic mock embedding for a given text.
   * Useful for testing and local development without API keys.
   */
  private generateMockEmbedding(text: string): number[] {
    const size = 1536; // OpenAI small embedding size
    const vector = new Array(size).fill(0);
    
    // Simple hash to seed the random-ish numbers
    let hash = 0;
    const normalizedText = text.toLowerCase().replace(/[^a-z]/g, "");
    for (let i = 0; i < normalizedText.length; i++) {
      hash = (hash << 5) - hash + normalizedText.charCodeAt(i);
      hash |= 0;
    }

    for (let i = 0; i < size; i++) {
      const seed = Math.sin(hash + i) * 10000;
      vector[i] = seed - Math.floor(seed);
    }
    
    return this.normalize(vector);
  }

  private normalize(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / norm);
  }
}
