import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Search, Trash2, BookOpen, FileText } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { StatusBadge } from '../components/ui/Badges';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

interface DocRow {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSizeBytes: number;
  status: string;
  chunkCount: number;
  isDemo: boolean;
  createdAt: string;
}

interface SearchResult {
  chunkId: string;
  title: string;
  chunkIndex: number;
  snippet: string;
  score: number;
}

export function KnowledgeBasePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('What is the monthly price for the Growth or Premium plan?');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['knowledge-docs'],
    queryFn: () => apiRequest<{ documents: DocRow[] }>('/knowledge'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name.replace(/\.(pdf|txt)$/i, ''));
      return apiRequest('/knowledge/upload', { method: 'POST', body: formData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-docs'] });
      toast({ title: 'Document indexed into vector store', type: 'success' });
    },
    onError: (err) => {
      toast({
        title: 'Upload failed',
        description: err instanceof Error ? err.message : 'Unable to process file',
        type: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/knowledge/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-docs'] });
      toast({ title: 'Document removed from knowledge base', type: 'success' });
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Permission required',
        type: 'error',
      });
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await apiRequest<{ results: SearchResult[] }>('/knowledge/search', {
        method: 'POST',
        body: JSON.stringify({ query, topK: 4 }),
      });
      setSearchResults(res.results);
    } finally {
      setSearching(false);
    }
  };

  const docs = data?.documents || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">RAG Knowledge Base</h1>
          <p className="text-sm text-[#94A3B8]">
            Upload product PDF/TXT documents, inspect vector chunks, and test similarity retrieval.
          </p>
        </div>

        <label className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-indigo-500 text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer">
          <Upload className="w-3.5 h-3.5" />
          <span>{uploadMutation.isPending ? 'Indexing...' : 'Upload PDF / TXT'}</span>
          <input
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadMutation.mutate(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Uploaded Documents */}
        <div className="enterprise-card p-5 space-y-3">
          <h2 className="text-sm font-semibold">Indexed Documents ({docs.length})</h2>
          {isLoading ? (
            <p className="text-xs text-[#94A3B8]">Loading documents...</p>
          ) : (
            <div className="space-y-2.5">
              {docs.map((d) => (
                <div
                  key={d.id}
                  className="p-3 rounded-lg bg-[#090D16] border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#06B6D4] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-100 truncate">{d.title}</div>
                      <div className="text-[11px] text-[#94A3B8]">
                        {d.fileType} • {d.chunkCount} chunks • {(d.fileSizeBytes / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge value={d.status} />
                    <button
                      onClick={() => setDeleteTarget(d)}
                      className="p-1.5 rounded text-[#94A3B8] hover:text-[#EF4444]"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RAG Search Tester */}
        <div className="enterprise-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#6366F1]" />
              <span>Knowledge Search Testing Interface</span>
            </h2>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Test vector similarity + lexical retrieval with source attribution.
            </p>
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a product, pricing, or security question..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#090D16] border border-slate-800 text-xs focus:outline-none focus:border-[#6366F1]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-4 py-2 rounded-lg bg-[#6366F1] text-white text-xs font-medium"
            >
              {searching ? 'Searching...' : 'Test Retrieval'}
            </button>
          </form>

          <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="text-xs text-[#94A3B8]">
                Click <strong>Test Retrieval</strong> to inspect matching chunks and similarity scores.
              </p>
            ) : (
              searchResults.map((r) => (
                <div key={r.chunkId} className="p-3 rounded-lg bg-[#090D16] border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#06B6D4]">
                      {r.title} (Chunk #{r.chunkIndex})
                    </span>
                    <span className="font-mono text-[11px] text-[#22C55E]">Score: {r.score}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{r.snippet}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Knowledge Document"
        description={`Remove "${deleteTarget?.title}" and all its vector chunks?`}
        confirmLabel="Delete"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
