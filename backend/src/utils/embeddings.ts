/**
 * Deterministic 768-dimensional local embedding generator (feature-hashing + n-gram projection)
 * used as an offline/demo fallback when GEMINI_API_KEY is not configured.
 * When GEMINI_API_KEY is available, ragService uses Gemini text-embedding-004.
 */
export function generateDeterministicEmbedding(text: string, dimensions = 768): number[] {
  const vec = new Array<number>(dimensions).fill(0);
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s₹]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (normalized.length === 0) return vec;

  // Unigrams + bigrams for better semantic matching
  const tokens: string[] = [...normalized];
  for (let i = 0; i < normalized.length - 1; i++) {
    tokens.push(`${normalized[i]}_${normalized[i + 1]}`);
  }

  for (const token of tokens) {
    let h1 = 2166136261;
    let h2 = 0x811c9dc5;
    for (let i = 0; i < token.length; i++) {
      const c = token.charCodeAt(i);
      h1 ^= c;
      h1 = Math.imul(h1, 16777619);
      h2 = Math.imul(h2 ^ c, 2654435761);
    }
    const idx1 = Math.abs(h1) % dimensions;
    const idx2 = Math.abs(h2) % dimensions;
    const sign = (h1 & 1) === 0 ? 1 : -1;
    vec[idx1] += sign * 1.0;
    vec[idx2] += sign * 0.5;
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] = Number((vec[i] / norm).toFixed(6));
    }
  }
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
