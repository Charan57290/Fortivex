import pdfParse from 'pdf-parse';
import { store } from '../../db/store';
import { KnowledgeChunk, KnowledgeDocument } from '../../types/domain';
import { cosineSimilarity, generateDeterministicEmbedding } from '../../utils/embeddings';
import { geminiProvider } from '../ai/llmProvider';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  content: string;
  snippet: string;
  score: number;
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/gi,
  /disregard\s+(all\s+)?system\s+prompt/gi,
  /you\s+are\s+now\s+in\s+developer\s+mode/gi,
  /<\s*script[^>]*>.*?<\s*\/\s*script\s*>/gis,
];

export function sanitizeDocumentText(rawText: string): string {
  let clean = rawText.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim();
  for (const pattern of INJECTION_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED_UNTRUSTED_DIRECTIVE]');
  }
  return clean;
}

export function chunkText(text: string, chunkSize = 650, overlap = 100): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).trim().length <= chunkSize) {
      current = current ? `${current}\n\n${para}` : para;
    } else {
      if (current) chunks.push(current);
      if (para.length <= chunkSize) {
        current = para;
      } else {
        // Split long paragraph by sentence or fixed window
        let start = 0;
        while (start < para.length) {
          const slice = para.slice(start, start + chunkSize).trim();
          if (slice) chunks.push(slice);
          start += Math.max(1, chunkSize - overlap);
        }
        current = '';
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export async function extractTextFromBuffer(buffer: Buffer, fileType: string): Promise<string> {
  if (fileType.toUpperCase() === 'PDF') {
    const parsed = await pdfParse(buffer);
    return parsed.text || '';
  }
  return buffer.toString('utf-8');
}

export async function computeEmbedding(text: string, useGemini = false): Promise<number[]> {
  if (useGemini && geminiProvider.isConfigured()) {
    try {
      return await geminiProvider.generateEmbedding(text);
    } catch {
      // Fall back to deterministic embedding if embedding endpoint throttles
      return generateDeterministicEmbedding(text);
    }
  }
  return generateDeterministicEmbedding(text);
}

export async function ingestKnowledgeDocument(params: {
  organizationId: string;
  uploadedById?: string | null;
  title: string;
  fileName: string;
  fileType: 'PDF' | 'TXT';
  buffer: Buffer;
}): Promise<KnowledgeDocument> {
  const now = new Date().toISOString();
  const doc: KnowledgeDocument = {
    id: store.newId('doc'),
    organizationId: params.organizationId,
    uploadedById: params.uploadedById ?? null,
    title: params.title,
    fileName: params.fileName,
    fileType: params.fileType,
    fileSizeBytes: params.buffer.length,
    status: 'PROCESSING',
    chunkCount: 0,
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  };

  store.db.knowledgeDocuments.unshift(doc);
  store.save();

  try {
    const rawText = await extractTextFromBuffer(params.buffer, params.fileType);
    const sanitized = sanitizeDocumentText(rawText);
    if (!sanitized || sanitized.length < 15) {
      throw new Error('Document contains insufficient readable text.');
    }

    const pieces = chunkText(sanitized);
    const createdChunks: KnowledgeChunk[] = [];

    for (let i = 0; i < pieces.length; i++) {
      const content = pieces[i];
      const embedding = await computeEmbedding(content);
      createdChunks.push({
        id: store.newId('chk'),
        organizationId: params.organizationId,
        documentId: doc.id,
        chunkIndex: i,
        content,
        tokenCount: content.split(/\s+/).filter(Boolean).length,
        metadata: { sourceTitle: doc.title, fileName: doc.fileName },
        embedding,
        createdAt: new Date().toISOString(),
      });
    }

    store.db.knowledgeChunks.push(...createdChunks);
    doc.status = 'INDEXED';
    doc.chunkCount = createdChunks.length;
    doc.updatedAt = new Date().toISOString();
    store.save();
    return doc;
  } catch (err) {
    doc.status = 'FAILED';
    doc.errorMessage = err instanceof Error ? err.message : 'Failed to process document';
    doc.updatedAt = new Date().toISOString();
    store.save();
    throw err;
  }
}

export async function searchKnowledgeBase(params: {
  organizationId: string;
  query: string;
  topK?: number;
}): Promise<RetrievedChunk[]> {
  const topK = params.topK ?? 4;
  const orgChunks = store.db.knowledgeChunks.filter(
    (c) => c.organizationId === params.organizationId
  );
  if (orgChunks.length === 0) return [];

  const queryEmbedding = await computeEmbedding(params.query);
  const queryTerms = params.query
    .toLowerCase()
    .replace(/[^a-z0-9\s₹]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const docMap = new Map(
    store.db.knowledgeDocuments
      .filter((d) => d.organizationId === params.organizationId)
      .map((d) => [d.id, d])
  );

  const scored = orgChunks.map((chunk) => {
    const doc = docMap.get(chunk.documentId);
    const vecScore =
      chunk.embedding && chunk.embedding.length === queryEmbedding.length
        ? cosineSimilarity(queryEmbedding, chunk.embedding)
        : 0;

    // Lexical overlap boost for exact product/plan/price queries
    const lower = chunk.content.toLowerCase();
    let keywordHits = 0;
    for (const term of queryTerms) {
      if (lower.includes(term)) keywordHits++;
    }
    const lexicalScore = queryTerms.length > 0 ? keywordHits / queryTerms.length : 0;
    const combined = Number((vecScore * 0.65 + lexicalScore * 0.35).toFixed(4));

    return {
      chunkId: chunk.id,
      documentId: chunk.documentId,
      title: doc?.title ?? 'Company Knowledge Document',
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      snippet: chunk.content.slice(0, 220) + (chunk.content.length > 220 ? '...' : ''),
      score: combined,
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score > 0.08)
    .slice(0, topK);
}
